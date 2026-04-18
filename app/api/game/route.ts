/**
 * /app/api/game/route.ts
 */

import { NextRequest, NextResponse } from "next/server"

export type GameEventType =
  | "PLAYER_JOINED"
  | "PLAYER_LEFT"
  | "PLAYER_KICKED"
  | "HOST_CHANGED"
  | "GAME_STATE_CHANGED"
  | "VOTE_CAST"
  | "PLAYER_READY"
  | "TURN_REQUESTED"
  | "TURN_RELEASED"
  | "ANSWER_SUBMITTED"
  | "HEARTBEAT"

export interface GameEvent {
  type: GameEventType
  roomId: string
  playerId: string
  playerName?: string
  payload?: Record<string, unknown>
  timestamp: number
}

interface RoomState {
  gameState: string
  hostId: string | null
  currentTurnHolder: string | null
  players: Record<string, { name: string; isReady: boolean; isConnected: boolean }>
  votes: Record<string, number>
  selectedCategory: string | null
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
      selectedCategory: null,
      clients: new Map(),
    })
  }
  return rooms.get(roomId)!
}

/**
 * Elige el nuevo anfitrión: primer jugador conectado que no sea el actual host.
 * Devuelve null si no hay nadie más.
 */
function electNewHost(room: RoomState, leavingId: string): string | null {
  const candidates = Object.entries(room.players)
    .filter(([id, p]) => id !== leavingId && p.isConnected)
    .map(([id]) => id)
  return candidates[0] ?? null
}

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
// GET — abre stream SSE
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const roomId      = searchParams.get("roomId")      ?? "DEFAULT"
  const playerId    = searchParams.get("playerId")    ?? `anon-${Date.now()}`
  const playerName  = searchParams.get("playerName")  ?? "Jugador"

  const room = getOrCreateRoom(roomId)

  // Primer jugador en unirse es el anfitrión
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

      // Heartbeat
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

      // Cleanup al desconectar
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

        // Transferir host si el que se va era el anfitrión
        if (room.hostId === playerId) {
          const newHost = electNewHost(room, playerId)
          room.hostId = newHost

          if (newHost) {
            broadcast(roomId, {
              type: "HOST_CHANGED",
              roomId,
              playerId,
              payload: {
                newHostId: newHost,
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
          payload: { players: room.players, hostId: room.hostId },
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
// POST — procesa acciones del juego
// ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = (await request.json()) as GameEvent
  const { type, roomId, playerId, playerName, payload } = body
  const room = getOrCreateRoom(roomId)

  switch (type) {

    case "GAME_STATE_CHANGED": {
      const newState = payload?.gameState as string
      if (newState) room.gameState = newState
      broadcast(roomId, {
        ...body,
        payload: { ...payload, gameState: room.gameState, hostId: room.hostId },
        timestamp: Date.now(),
      })
      break
    }

    case "VOTE_CAST": {
      const category = payload?.category as string
      if (category) {
        room.votes[category] = (room.votes[category] ?? 0) + 1
        const connectedCount = Object.values(room.players).filter((p) => p.isConnected).length
        const totalVotes = Object.values(room.votes).reduce((a, b) => a + b, 0)
        if (totalVotes >= connectedCount) {
          room.selectedCategory = Object.entries(room.votes).sort((a, b) => b[1] - a[1])[0][0]
          room.gameState = "READY_CHECK"
        }
      }
      broadcast(roomId, {
        ...body,
        payload: { votes: room.votes, selectedCategory: room.selectedCategory, gameState: room.gameState },
        timestamp: Date.now(),
      })
      break
    }

    case "PLAYER_READY": {
      if (room.players[playerId]) {
        room.players[playerId].isReady = payload?.isReady as boolean
      }
      const allReady = Object.values(room.players)
        .filter((p) => p.isConnected)
        .every((p) => p.isReady)
      if (allReady && room.gameState === "READY_CHECK") {
        room.gameState = "ACTIVE_GAME"
      }
      broadcast(roomId, {
        ...body,
        payload: { players: room.players, gameState: room.gameState, hostId: room.hostId },
        timestamp: Date.now(),
      })
      break
    }

    // ── NUEVO: el anfitrión expulsa a un jugador ──
    case "KICK_PLAYER": {
      const targetId = payload?.targetId as string

      // Solo el anfitrión puede expulsar
      if (playerId !== room.hostId) {
        return NextResponse.json({ ok: false, reason: "not_host" }, { status: 403 })
      }
      if (!targetId || targetId === playerId) {
        return NextResponse.json({ ok: false, reason: "invalid_target" }, { status: 400 })
      }

      // Marcar como desconectado
      if (room.players[targetId]) {
        room.players[targetId].isConnected = false
      }

      // Cerrar el stream SSE del jugador expulsado si está conectado
      const targetController = room.clients.get(targetId)
      if (targetController) {
        try {
          // Enviar evento de expulsión antes de cerrar
          const kickMsg = `data: ${JSON.stringify({
            type: "PLAYER_KICKED",
            roomId,
            playerId: targetId,
            payload: { reason: "kicked_by_host" },
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

      broadcast(roomId, {
        type: "PLAYER_KICKED",
        roomId,
        playerId: targetId,
        payload: { players: room.players, kickedBy: playerId, hostId: room.hostId },
        timestamp: Date.now(),
      })
      break
    }

    case "TURN_REQUESTED": {
      if (room.currentTurnHolder === null) {
        room.currentTurnHolder = playerId
        broadcast(roomId, {
          ...body,
          payload: { currentTurnHolder: playerId, playerName },
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

    case "TURN_RELEASED": {
      if (room.currentTurnHolder === playerId) room.currentTurnHolder = null
      broadcast(roomId, { ...body, payload: { currentTurnHolder: null }, timestamp: Date.now() })
      break
    }

    case "ANSWER_SUBMITTED": {
      room.currentTurnHolder = null
      broadcast(roomId, {
        ...body,
        payload: { ...payload, currentTurnHolder: null },
        timestamp: Date.now(),
      })
      break
    }

    default:
      broadcast(roomId, { ...body, timestamp: Date.now() })
  }

  return NextResponse.json({ ok: true })
}
