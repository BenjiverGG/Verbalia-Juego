"use client"

import { Users, X } from "lucide-react"

interface Player {
  id: string
  name: string
  isConnected: boolean
  isHost?: boolean
}

interface LobbyScreenProps {
  players: Player[]
  roomCode: string
  onStartGame: () => void
  onKickPlayer: (playerId: string) => void
  isHost: boolean
  myId: string
}

export function LobbyScreen({
  players,
  roomCode,
  onStartGame,
  onKickPlayer,
  isHost,
  myId,
}: LobbyScreenProps) {
  const connected = players.filter((p) => p.isConnected)

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md">
      {/* Room Code */}
      <div className="text-center">
        <span className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">
          CÓDIGO DE SALA
        </span>
        <div className="text-4xl font-bold text-primary tracking-widest">{roomCode}</div>
      </div>

      {/* Players List */}
      <div className="w-full border-2 border-border">
        <div className="flex items-center gap-2 p-3 border-b-2 border-border">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-widest">
            JUGADORES ({connected.length}/8)
          </span>
        </div>

        <div className="divide-y-2 divide-border">
          {players.map((player) => (
            <div key={player.id} className="flex items-center justify-between p-4">
              {/* Indicador + nombre + badge */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 shrink-0 ${
                    player.isConnected ? "bg-accent" : "bg-destructive"
                  }`}
                />
                <span className="text-sm font-medium text-foreground">{player.name}</span>
                {player.isHost && (
                  <span className="text-xs text-primary border border-primary px-2 py-0.5 uppercase tracking-wider">
                    ANFITRIÓN
                  </span>
                )}
                {player.id === myId && !player.isHost && (
                  <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 uppercase tracking-wider">
                    TÚ
                  </span>
                )}
              </div>

              {/* Lado derecho: estado + botón kick */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {player.isConnected ? "CONECTADO" : "DESCONECTADO"}
                </span>

                {/* Solo el anfitrión ve el botón, y no puede expulsarse a sí mismo */}
                {isHost && player.id !== myId && (
                  <button
                    onClick={() => onKickPlayer(player.id)}
                    title={`Expulsar a ${player.name}`}
                    className="w-6 h-6 flex items-center justify-center border border-destructive/50 text-destructive/70 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones */}
      {isHost ? (
        <button
          onClick={onStartGame}
          disabled={connected.length < 2}
          className="w-full px-8 py-4 bg-primary text-primary-foreground border-2 border-primary font-bold uppercase tracking-wider text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          INICIAR PARTIDA
        </button>
      ) : (
        <div className="text-center text-sm text-muted-foreground uppercase tracking-widest">
          Esperando a que el anfitrión inicie la partida...
        </div>
      )}
    </div>
  )
}
