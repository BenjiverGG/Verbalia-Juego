/**
 * app/api/game/route.ts
 *
 * IMPORTANTE PARA VERCEL: export const runtime = "nodejs" es obligatorio.
 * Sin esto, Vercel usa Edge Runtime que no soporta streams SSE largos.
 */
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

export type GameEventType =
  | "PLAYER_JOINED"
  | "PLAYER_LEFT"
  | "PLAYER_KICKED"       // host expulsa a un jugador         (BUG 3)
  | "HOST_CHANGED"        // el host se fue, hay nuevo host    (BUG 1)
  | "GAME_STATE_CHANGED"
  | "VOTE_CAST"
  | "VOTING_TIMEOUT"      // los 15s de votación terminaron    (BUG 4)
  | "PLAYER_READY"
  | "TURN_REQUESTED"
  | "TURN_RELEASED"
  | "ANSWER_SUBMITTED"
  | "LETTER_TIMEOUT"      // timer de letra llegó a 0          (BUG 2)
  | "HEARTBEAT"

export interface GameEvent {
  type: GameEventType
  roomId: string
  playerId: string
  playerName?: string
  payload?: Record<string, unknown>
  timestamp: number
}

// ─────────────────────────────────────────────
// Categorías disponibles para votación aleatoria
// ─────────────────────────────────────────────

const CATEGORIES = [
  "PAÍSES DEL MUNDO",
  "ANIMALES",
  "CIUDADES",
  "PROFESIONES",
  "COMIDAS Y BEBIDAS",
]

const VOTING_SECONDS = 15   // BUG 4: duración de la votación
const LETTER_SECONDS = 31   // BUG 2: 31s = 30s del cliente + 1s de margen
const ALPHABET_LENGTH = 27  // A–Z + Ñ

// ─────────────────────────────────────────────
// Estado global en memoria del servidor
// ─────────────────────────────────────────────

interface RoomState {
  gameState: string
  hostId: string | null
  currentTurnHolder: string | null
  players: Record<string, { name: string; isReady: boolean; isConnected: boolean }>
  votes: Record<string, number>
  votersSet: Set<string>                                        // quién ya votó (evita doble voto)
  selectedCategory: string | null
  votingTimer: ReturnType<typeof setTimeout> | null             // BUG 4: timer de votación
  letterTimer: ReturnType<typeof setTimeout> | null             // BUG 2: timer de letra
  currentLetterIndex: number                                    // BUG 2: letra actual en el servidor
  clients: Map<string, ReadableStreamDefaultController>
}

const rooms = new Map<string, RoomState>()

function getOrCreateRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      gameState: "LOBBY",
      hostId: null,
      currentTurnHolder: null,
      players: {},
      votes: {},
      votersSet: new Set(),
      selectedCategory: null,
      votingTimer: null,
      letterTimer: null,
      currentLetterIndex: 0,
      clients: new Map(),
    })
  }
  return rooms.get(roomId)!
}

// ─────────────────────────────────────────────
// Broadcast SSE a todos los clientes del room
// ─────────────────────────────────────────────

function broadcast(roomId: string, event: GameEvent) {
  const room = rooms.get(roomId)
  if (!room) return
  const data = `data: ${JSON.stringify(event)}\n\n`
  for (const [clientId, controller] of room.clients) {
    try {
      controller.enqueue(new TextEncoder().encode(data))
    } catch {
      room.clients.delete(clientId)
    }
  }
}

// ─────────────────────────────────────────────
// BUG 1: Elige nuevo host entre los jugadores conectados
// ─────────────────────────────────────────────

function electNewHost(room: RoomState, leavingId: string): string | null {
  const candidates = Object.entries(room.players)
    .filter(([id, p]) => id !== leavingId && p.isConnected)
    .map(([id]) => id)
  return candidates[0] ?? null
}

// ─────────────────────────────────────────────
// BUG 4: Timer de votación de 15 segundos
// Si nadie votó → categoría aleatoria
// Si 1 o más votaron → la que tiene más votos
// ─────────────────────────────────────────────

function startVotingTimer(roomId: string) {
  const room = rooms.get(roomId)
  if (!room) return
  if (room.votingTimer) clearTimeout(room.votingTimer)

  room.votingTimer = setTimeout(() => {
    const r = rooms.get(roomId)
    if (!r || r.gameState !== "VOTING") return

    const winner =
      Object.keys(r.votes).length === 0
        ? CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]  // nadie votó → aleatorio
        : Object.entries(r.votes).sort((a, b) => b[1] - a[1])[0][0] // más votada

    r.selectedCategory = winner
    r.gameState = "READY_CHECK"
    r.votingTimer = null

    broadcast(roomId, {
      type: "VOTING_TIMEOUT",
      roomId,
      playerId: "server",
      payload: {
        selectedCategory: winner,
        votes: r.votes,
        gameState: "READY_CHECK",
      },
      timestamp: Date.now(),
    })
  }, VOTING_SECONDS * 1000)
}

// ─────────────────────────────────────────────
// BUG 2: Timer de letra en el servidor
// Si nadie respondió en 31s → emite LETTER_TIMEOUT
// y avanza la letra para todos
// ─────────────────────────────────────────────

function startLetterTimer(roomId: string, letterIndex: number) {
  const room = rooms.get(roomId)
  if (!room) return
  if (room.letterTimer) clearTimeout(room.letterTimer)

  room.letterTimer = setTimeout(() => {
    const r = rooms.get(roomId)
    if (!r || r.gameState !== "ACTIVE_GAME") return

    r.currentTurnHolder = null
    r.letterTimer = null
    r.currentLetterIndex = letterIndex + 1

    broadcast(roomId, {
      type: "LETTER_TIMEOUT",
      roomId,
      playerId: "server",
      payload: {
        letterIndex,          // letra que venció
        currentTurnHolder: null,
      },
      timestamp: Date.now(),
    })

    // Arrancar timer para la siguiente letra (si quedan)
    if (letterIndex + 1 < ALPHABET_LENGTH) {
      startLetterTimer(roomId, letterIndex + 1)
    }
  }, LETTER_SECONDS * 1000)
}

// ─────────────────────────────────────────────
// Limpieza completa de timers de una sala
// ─────────────────────────────────────────────

function clearRoomTimers(room: RoomState) {
  if (room.votingTimer) { clearTimeout(room.votingTimer); room.votingTimer = null }
  if (room.letterTimer) { clearTimeout(room.letterTimer); room.letterTimer = null }
}

// ─────────────────────────────────────────────
// GET — Abre stream SSE
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const roomId     = searchParams.get("roomId")     ?? "DEFAULT"
  const playerId   = searchParams.get("playerId")   ?? `anon-${Date.now()}`
  const playerName = searchParams.get("playerName") ?? "Jugador"

  const room = getOrCreateRoom(roomId)

  // El primer jugador en conectarse es el host
  if (!room.hostId || !room.players[room.hostId]) {
    room.hostId = playerId
  }

  room.players[playerId] = { name: playerName, isReady: false, isConnected: true }

  const stream = new ReadableStream({
    start(controller) {
      room.clients.set(playerId, controller)

      // Estado inicial para el nuevo jugador
      const initEvent: GameEvent = {
        type: "PLAYER_JOINED",
        roomId,
        playerId,
        playerName,
        payload: {
          gameState: room.gameState,
          players: room.players,
          votes: room.votes,
          selectedCategory: room.selectedCategory,
          currentTurnHolder: room.currentTurnHolder,
          hostId: room.hostId,
        },
        timestamp: Date.now(),
      }
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(initEvent)}\n\n`))

      // Notificar a los demás
      broadcast(roomId, {
        type: "PLAYER_JOINED",
        roomId,
        playerId,
        playerName,
        payload: { players: room.players, hostId: room.hostId },
        timestamp: Date.now(),
      })

      // Heartbeat cada 25s para mantener la conexión viva
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: "HEARTBEAT", timestamp: Date.now() })}\n\n`
            )
          )
        } catch {
          clearInterval(heartbeat)
        }
      }, 25000)

      // ── Cleanup al desconectar ──
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        room.clients.delete(playerId)

        if (room.players[playerId]) {
          room.players[playerId].isConnected = false
        }

        // Liberar turno si lo tenía
        if (room.currentTurnHolder === playerId) {
          room.currentTurnHolder = null
        }

        // BUG 1: transferir host si el que se fue era el anfitrión
        if (room.hostId === playerId) {
          const newHost = electNewHost(room, playerId)
          room.hostId = newHost
          if (newHost) {
            broadcast(roomId, {
              type: "HOST_CHANGED",
              roomId,
              playerId,                 // quién se fue
              payload: {
                newHostId: newHost,
                newHostName: room.players[newHost]?.name,
                players: room.players,
              },
              timestamp: Date.now(),
            })
          }
        }

        broadcast(roomId, {
          type: "PLAYER_LEFT",
          roomId,
          playerId,
          payload: {
            players: room.players,
            hostId: room.hostId,
            currentTurnHolder: room.currentTurnHolder,
          },
          timestamp: Date.now(),
        })

        try { controller.close() } catch { /* ya cerrado */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}

// ─────────────────────────────────────────────
// POST — Procesa acciones del juego
// ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = (await request.json()) as GameEvent
  const { type, roomId, playerId, playerName, payload } = body
  const room = getOrCreateRoom(roomId)

  switch (type) {

    // ── Cambio de estado general ──
    case "GAME_STATE_CHANGED": {
      const newState = payload?.gameState as string
      if (newState) room.gameState = newState

      if (newState === "VOTING") {
        // BUG 4: resetear votos y arrancar timer de 15s
        room.votes = {}
        room.votersSet = new Set()
        room.selectedCategory = null
        startVotingTimer(roomId)
      }

      if (newState === "ACTIVE_GAME") {
        // BUG 2: arrancar timer de primera letra
        room.currentLetterIndex = 0
        startLetterTimer(roomId, 0)
      }

      if (newState === "LOBBY") {
        // Reset completo: cancelar timers y limpiar estado
        clearRoomTimers(room)
        room.votes = {}
        room.votersSet = new Set()
        room.selectedCategory = null
        room.currentTurnHolder = null
        room.currentLetterIndex = 0
        Object.values(room.players).forEach((p) => { p.isReady = false })
      }

      broadcast(roomId, {
        ...body,
        payload: {
          ...payload,
          gameState: room.gameState,
          hostId: room.hostId,
          players: room.players,
        },
        timestamp: Date.now(),
      })
      break
    }

    // ── Voto de categoría ──
    case "VOTE_CAST": {
      const category = payload?.category as string

      // Ignorar si ya votó este jugador
      if (category && !room.votersSet.has(playerId)) {
        room.votersSet.add(playerId)
        room.votes[category] = (room.votes[category] ?? 0) + 1
      }

      // Si todos los conectados ya votaron → resolver inmediatamente
      const connectedCount = Object.values(room.players).filter((p) => p.isConnected).length
      const allVoted = room.votersSet.size >= connectedCount

      if (allVoted) {
        // BUG 4: cancelar el timer y resolver ya
        clearRoomTimers(room)
        const winner = Object.entries(room.votes).sort((a, b) => b[1] - a[1])[0][0]
        room.selectedCategory = winner
        room.gameState = "READY_CHECK"

        broadcast(roomId, {
          type: "VOTING_TIMEOUT",
          roomId,
          playerId: "server",
          payload: {
            selectedCategory: winner,
            votes: room.votes,
            gameState: "READY_CHECK",
          },
          timestamp: Date.now(),
        })
      } else {
        // Broadcast parcial para que todos vean los votos en tiempo real
        broadcast(roomId, {
          ...body,
          payload: {
            votes: room.votes,
            selectedCategory: room.selectedCategory,
          },
          timestamp: Date.now(),
        })
      }
      break
    }

    // ── Ready check ──
    case "PLAYER_READY": {
      if (room.players[playerId]) {
        room.players[playerId].isReady = payload?.isReady as boolean
      }
      const allReady = Object.values(room.players)
        .filter((p) => p.isConnected)
        .every((p) => p.isReady)

      if (allReady && room.gameState === "READY_CHECK") {
        room.gameState = "ACTIVE_GAME"
        // BUG 2: arrancar timer al confirmar que todos están listos
        room.currentLetterIndex = 0
        startLetterTimer(roomId, 0)
      }

      broadcast(roomId, {
        ...body,
        payload: {
          players: room.players,
          gameState: room.gameState,
          hostId: room.hostId,
        },
        timestamp: Date.now(),
      })
      break
    }

    // ── BUG 3: host expulsa a un jugador ──
    // Nota: tu archivo usaba "KICK_PLAYER", el cliente usa "PLAYER_KICKED".
    // Soportamos AMBOS para que funcione sin importar cuál envíe el cliente.
    case "KICK_PLAYER":
    case "PLAYER_KICKED": {
      const targetId = (payload?.targetId ?? payload?.targetPlayerId) as string

      // Solo el host puede expulsar
      if (playerId !== room.hostId) {
        return NextResponse.json({ ok: false, reason: "not_host" }, { status: 403 })
      }
      if (!targetId || targetId === playerId) {
        return NextResponse.json({ ok: false, reason: "invalid_target" }, { status: 400 })
      }
      if (!room.players[targetId]) {
        return NextResponse.json({ ok: false, reason: "player_not_found" }, { status: 404 })
      }

      // Marcar como desconectado
      room.players[targetId].isConnected = false

      // Enviar evento de kick al jugador expulsado antes de cerrar su stream
      const targetController = room.clients.get(targetId)
      if (targetController) {
        try {
          const kickMsg = `data: ${JSON.stringify({
            type: "PLAYER_KICKED",
            roomId,
            playerId: targetId,
            payload: { reason: "kicked_by_host", kicked: true },
            timestamp: Date.now(),
          })}\n\n`
          targetController.enqueue(new TextEncoder().encode(kickMsg))
          targetController.close()
        } catch { /* ya cerrado */ }
        room.clients.delete(targetId)
      }

      // Liberar turno si lo tenía
      if (room.currentTurnHolder === targetId) {
        room.currentTurnHolder = null
      }

      // Broadcast a los demás
      broadcast(roomId, {
        type: "PLAYER_KICKED",
        roomId,
        playerId: targetId,
        payload: {
          players: room.players,
          kickedBy: playerId,
          hostId: room.hostId,
          currentTurnHolder: room.currentTurnHolder,
        },
        timestamp: Date.now(),
      })
      break
    }

    // ── Pedir turno ──
    case "TURN_REQUESTED": {
      if (room.currentTurnHolder === null) {
        room.currentTurnHolder = playerId

        // BUG 2: al pedir turno, cancelamos el timer automático porque
        // ahora hay un jugador activo. El timer se reiniciará cuando
        // envíe su respuesta o cuando ANSWER_SUBMITTED lo avance.
        if (room.letterTimer) clearTimeout(room.letterTimer)

        broadcast(roomId, {
          ...body,
          payload: { currentTurnHolder: playerId, playerName, hostId: room.hostId },
          timestamp: Date.now(),
        })
      } else {
        return NextResponse.json(
          { ok: false, reason: "turn_taken", holder: room.currentTurnHolder },
          { status: 409 }
        )
      }
      break
    }

    // ── Liberar turno ──
    case "TURN_RELEASED": {
      if (room.currentTurnHolder === playerId) room.currentTurnHolder = null
      broadcast(roomId, {
        ...body,
        payload: { currentTurnHolder: null, hostId: room.hostId },
        timestamp: Date.now(),
      })
      break
    }

    // ── Respuesta enviada → avanzar letra ──
    case "ANSWER_SUBMITTED": {
      room.currentTurnHolder = null
      const nextIndex = (payload?.letterIndex as number ?? room.currentLetterIndex) + 1
      room.currentLetterIndex = nextIndex

      // BUG 2: cancelar timer de letra actual y arrancar el de la siguiente
      if (room.letterTimer) clearTimeout(room.letterTimer)
      if (nextIndex < ALPHABET_LENGTH) {
        startLetterTimer(roomId, nextIndex)
      }

      broadcast(roomId, {
        ...body,
        payload: {
          ...payload,
          currentTurnHolder: null,
          hostId: room.hostId,
        },
        timestamp: Date.now(),
      })
      break
    }

    default:
      broadcast(roomId, { ...body, timestamp: Date.now() })
  }

  return NextResponse.json({ ok: true })
}