/**
 * /app/api/game/route.ts
 *
 * API Route con Server-Sent Events (SSE) para sincronización en tiempo real.
 * No requiere Pusher ni ninguna dependencia externa.
 *
 * GET  /api/game?roomId=VERB-2024  → abre el stream SSE (escucha eventos)
 * POST /api/game                   → emite un evento a todos los jugadores del room
 */

import { NextRequest, NextResponse } from "next/server"

// ─────────────────────────────────────────────
// Tipos de eventos del juego
// ─────────────────────────────────────────────

export type GameEventType =
  | "PLAYER_JOINED"
  | "PLAYER_LEFT"
  | "GAME_STATE_CHANGED"   // cambio de pantalla (LOBBY → VOTING → etc.)
  | "VOTE_CAST"
  | "PLAYER_READY"
  | "TURN_REQUESTED"       // un jugador pidió turno → bloquea a los demás
  | "TURN_RELEASED"        // el jugador entregó/canceló el turno
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

// ─────────────────────────────────────────────
// Estado global en memoria del servidor
// (En producción usarías Redis o una DB)
// ─────────────────────────────────────────────

interface RoomState {
  gameState: string
  currentTurnHolder: string | null  // playerId que tiene el turno activo
  players: Record<string, { name: string; isReady: boolean; isConnected: boolean }>
  votes: Record<string, number>
  selectedCategory: string | null
  clients: Map<string, ReadableStreamDefaultController>
}

// Mapa global: roomId → estado de la sala
const rooms = new Map<string, RoomState>()

function getOrCreateRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      gameState: "LOBBY",
      currentTurnHolder: null,
      players: {},
      votes: {},
      selectedCategory: null,
      clients: new Map(),
    })
  }
  return rooms.get(roomId)!
}

// ─────────────────────────────────────────────
// Broadcast: envía un evento SSE a todos los
// clientes conectados al room
// ─────────────────────────────────────────────

function broadcast(roomId: string, event: GameEvent) {
  const room = rooms.get(roomId)
  if (!room) return

  const data = `data: ${JSON.stringify(event)}\n\n`

  for (const [clientId, controller] of room.clients) {
    try {
      controller.enqueue(new TextEncoder().encode(data))
    } catch {
      // Cliente desconectado — limpiarlo
      room.clients.delete(clientId)
    }
  }
}

// ─────────────────────────────────────────────
// GET /api/game?roomId=...&playerId=...&playerName=...
// Abre la conexión SSE. El cliente la mantiene abierta.
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get("roomId") ?? "DEFAULT"
  const playerId = searchParams.get("playerId") ?? `anon-${Date.now()}`
  const playerName = searchParams.get("playerName") ?? "Jugador"

  const room = getOrCreateRoom(roomId)

  // Registrar jugador
  room.players[playerId] = {
    name: playerName,
    isReady: false,
    isConnected: true,
  }

  // Crear stream SSE
  const stream = new ReadableStream({
    start(controller) {
      // Guardar referencia al controller para poder hacer broadcast
      room.clients.set(playerId, controller)

      // Enviar estado actual inmediatamente al nuevo jugador
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
        },
        timestamp: Date.now(),
      }
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify(initEvent)}\n\n`)
      )

      // Notificar a los demás que alguien se unió
      broadcast(roomId, {
        type: "PLAYER_JOINED",
        roomId,
        playerId,
        playerName,
        payload: { players: room.players },
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

      // Cleanup al desconectar
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        room.clients.delete(playerId)

        if (room.players[playerId]) {
          room.players[playerId].isConnected = false
        }

        // Si tenía el turno, liberarlo
        if (room.currentTurnHolder === playerId) {
          room.currentTurnHolder = null
          broadcast(roomId, {
            type: "TURN_RELEASED",
            roomId,
            playerId,
            payload: { players: room.players },
            timestamp: Date.now(),
          })
        } else {
          broadcast(roomId, {
            type: "PLAYER_LEFT",
            roomId,
            playerId,
            payload: { players: room.players },
            timestamp: Date.now(),
          })
        }

        try {
          controller.close()
        } catch {
          // Ya estaba cerrado
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Importante para nginx/Vercel
    },
  })
}

// ─────────────────────────────────────────────
// POST /api/game
// El cliente envía una acción → el servidor la
// procesa, actualiza el estado y hace broadcast.
// ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = (await request.json()) as GameEvent

  const { type, roomId, playerId, playerName, payload } = body
  const room = getOrCreateRoom(roomId)

  switch (type) {
    // ── Cambio de pantalla (host inicia partida, etc.) ──
    case "GAME_STATE_CHANGED": {
      const newState = payload?.gameState as string
      if (newState) {
        room.gameState = newState
      }
      broadcast(roomId, {
        ...body,
        payload: { ...payload, gameState: room.gameState },
        timestamp: Date.now(),
      })
      break
    }

    // ── Votación de categoría ──
    case "VOTE_CAST": {
      const category = payload?.category as string
      if (category) {
        room.votes[category] = (room.votes[category] ?? 0) + 1

        // Si todos votaron, elegir la categoría ganadora y avanzar
        const connectedCount = Object.values(room.players).filter(
          (p) => p.isConnected
        ).length
        const totalVotes = Object.values(room.votes).reduce((a, b) => a + b, 0)

        if (totalVotes >= connectedCount) {
          room.selectedCategory = Object.entries(room.votes).sort(
            (a, b) => b[1] - a[1]
          )[0][0]
          room.gameState = "READY_CHECK"
        }
      }
      broadcast(roomId, {
        ...body,
        payload: {
          votes: room.votes,
          selectedCategory: room.selectedCategory,
          gameState: room.gameState,
        },
        timestamp: Date.now(),
      })
      break
    }

    // ── Jugador listo / no listo ──
    case "PLAYER_READY": {
      if (room.players[playerId]) {
        room.players[playerId].isReady = payload?.isReady as boolean
      }

      // Si todos están listos, arrancar el juego
      const allReady = Object.values(room.players)
        .filter((p) => p.isConnected)
        .every((p) => p.isReady)

      if (allReady && room.gameState === "READY_CHECK") {
        room.gameState = "ACTIVE_GAME"
      }

      broadcast(roomId, {
        ...body,
        payload: {
          players: room.players,
          gameState: room.gameState,
        },
        timestamp: Date.now(),
      })
      break
    }

    // ── Pedir turno (bloquea a los demás) ──
    case "TURN_REQUESTED": {
      // Solo se concede si nadie más tiene el turno
      if (room.currentTurnHolder === null) {
        room.currentTurnHolder = playerId
        broadcast(roomId, {
          ...body,
          payload: { currentTurnHolder: playerId, playerName },
          timestamp: Date.now(),
        })
      } else {
        // Denegar — ya hay alguien con el turno
        return NextResponse.json(
          { ok: false, reason: "turn_taken", holder: room.currentTurnHolder },
          { status: 409 }
        )
      }
      break
    }

    // ── Liberar turno (respuesta enviada o canceló) ──
    case "TURN_RELEASED": {
      if (room.currentTurnHolder === playerId) {
        room.currentTurnHolder = null
      }
      broadcast(roomId, {
        ...body,
        payload: { currentTurnHolder: null },
        timestamp: Date.now(),
      })
      break
    }

    // ── Respuesta enviada → avanzar letra ──
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