"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface Player {
  id: string
  name: string
  isReady: boolean
}

interface ReadyCheckScreenProps {
  players: Player[]
  isReady: boolean
  category: string
  onToggleReady: () => void
}

export function ReadyCheckScreen({ 
  players, 
  isReady, 
  category, 
  onToggleReady 
}: ReadyCheckScreenProps) {
  const readyCount = players.filter(p => p.isReady).length

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md">
      {/* Header */}
      <div className="text-center">
        <span className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">
          CATEGORÍA SELECCIONADA
        </span>
        <h2 className="text-2xl font-bold text-primary uppercase tracking-wider">
          {category}
        </h2>
      </div>

      {/* Ready Toggle */}
      <button
        onClick={onToggleReady}
        className={cn(
          "w-full max-w-xs px-8 py-6 border-4 font-bold uppercase tracking-wider transition-all",
          isReady 
            ? "bg-accent text-accent-foreground border-accent" 
            : "bg-secondary text-secondary-foreground border-border hover:border-primary"
        )}
      >
        <div className="flex items-center justify-center gap-3">
          {isReady && <Check className="w-6 h-6" />}
          <span className="text-lg">
            {isReady ? "LISTO" : "PREPARARSE"}
          </span>
        </div>
      </button>

      {/* Players Status */}
      <div className="w-full border-2 border-border">
        <div className="p-3 border-b-2 border-border">
          <span className="text-xs text-muted-foreground uppercase tracking-widest">
            JUGADORES LISTOS ({readyCount}/{players.length})
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-px bg-border">
          {players.map((player) => (
            <div 
              key={player.id} 
              className={cn(
                "flex items-center gap-2 p-3 bg-card transition-colors",
                player.isReady && "bg-accent/10"
              )}
            >
              <div 
                className={cn(
                  "w-2 h-2 transition-colors",
                  player.isReady ? "bg-accent" : "bg-muted"
                )}
              />
              <span className={cn(
                "text-sm truncate",
                player.isReady ? "text-accent" : "text-muted-foreground"
              )}>
                {player.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="text-center text-sm text-muted-foreground">
        {readyCount === players.length 
          ? "Todos listos. Iniciando partida..." 
          : `Esperando a ${players.length - readyCount} jugadores...`
        }
      </div>
    </div>
  )
}
