"use client"

import { Users } from "lucide-react"

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
  isHost: boolean
}

export function LobbyScreen({ players, roomCode, onStartGame, isHost }: LobbyScreenProps) {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md">
      {/* Room Code */}
      <div className="text-center">
        <span className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">
          CÓDIGO DE SALA
        </span>
        <div className="text-4xl font-bold text-primary tracking-widest">
          {roomCode}
        </div>
      </div>

      {/* Players List */}
      <div className="w-full border-2 border-border">
        <div className="flex items-center gap-2 p-3 border-b-2 border-border">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-widest">
            JUGADORES ({players.length}/8)
          </span>
        </div>
        
        <div className="divide-y-2 divide-border">
          {players.map((player) => (
            <div key={player.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div 
                  className={`w-2 h-2 ${player.isConnected ? "bg-accent" : "bg-destructive"}`}
                />
                <span className="text-sm font-medium text-foreground">
                  {player.name}
                </span>
                {player.isHost && (
                  <span className="text-xs text-primary border border-primary px-2 py-0.5">
                    ANFITRIÓN
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {player.isConnected ? "CONECTADO" : "DESCONECTADO"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Start Button (only for host) */}
      {isHost && (
        <button
          onClick={onStartGame}
          disabled={players.length < 2}
          className="w-full px-8 py-4 bg-primary text-primary-foreground border-2 border-primary font-bold uppercase tracking-wider text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          INICIAR PARTIDA
        </button>
      )}

      {!isHost && (
        <div className="text-center text-sm text-muted-foreground">
          Esperando a que el anfitrión inicie la partida...
        </div>
      )}
    </div>
  )
}
