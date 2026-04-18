"use client"

/**
 * components/game/leaderboard.tsx
 *
 * Panel lateral de puntuaciones en tiempo real.
 * - Ordenado de mayor a menor puntaje automáticamente.
 * - Animación CSS suave cuando un jugador sube de posición.
 * - Primer lugar resaltado con borde dorado y animación.
 * - El jugador actual tiene el distintivo "(Tú)".
 * - Se actualiza con los datos de `players` y `scores` del estado global.
 */

import { useEffect, useRef, useState } from "react"
import { Trophy, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

interface LeaderboardEntry {
  id: string
  name: string
  score: number
  correctAnswers: number
}

interface LeaderboardProps {
  /** Estado `scores` de page.tsx */
  scores: LeaderboardEntry[]
  /** ID del jugador local (myId de page.tsx) */
  myId: string
}

export function Leaderboard({ scores, myId }: LeaderboardProps) {
  // Mantener el orden previo para animar cambios de posición
  const prevOrderRef = useRef<string[]>([])
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set())

  // Ordenar de mayor a menor puntaje, top 5
  const sorted = [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  // Detectar jugadores que subieron de posición
  useEffect(() => {
    const currentOrder = sorted.map((p) => p.id)
    const prevOrder = prevOrderRef.current

    if (prevOrder.length === 0) {
      prevOrderRef.current = currentOrder
      return
    }

    const promoted = new Set<string>()
    currentOrder.forEach((id, newIndex) => {
      const oldIndex = prevOrder.indexOf(id)
      if (oldIndex !== -1 && newIndex < oldIndex) {
        promoted.add(id)
      }
    })

    if (promoted.size > 0) {
      setAnimatingIds(promoted)
      const timer = setTimeout(() => setAnimatingIds(new Set()), 700)
      prevOrderRef.current = currentOrder
      return () => clearTimeout(timer)
    }

    prevOrderRef.current = currentOrder
  }, [sorted])

  if (scores.length === 0) {
    return (
      <div className="w-full border-2 border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-widest">
            MARCADOR
          </span>
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider text-center py-4">
          Esperando jugadores...
        </p>
      </div>
    )
  }

  return (
    <div className="w-full border-2 border-border">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b-2 border-border">
        <Trophy className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-primary uppercase tracking-widest">
          MARCADOR
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1.5rem_1fr_auto] gap-3 px-3 py-2 border-b border-border">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">#</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">JUGADOR</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest text-right">PTS</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {sorted.map((player, index) => {
          const isFirst = index === 0
          const isMe = player.id === myId
          const isPromoted = animatingIds.has(player.id)

          return (
            <div
              key={player.id}
              className={cn(
                "grid grid-cols-[1.5rem_1fr_auto] gap-3 px-3 py-3 items-center",
                "transition-all duration-500 ease-out",
                // Primer lugar: borde dorado y fondo tenue
                isFirst && "border-l-4 border-l-yellow-500/80 bg-yellow-500/5",
                // Jugador que subió de posición: flash animado
                isPromoted && "animate-[rankUp_0.6s_ease-out]",
                // No primer lugar
                !isFirst && "border-l-4 border-l-transparent",
              )}
            >
              {/* Posición */}
              <div className="flex items-center justify-center w-6">
                {isFirst ? (
                  <Crown className="w-4 h-4 text-yellow-500" />
                ) : (
                  <span className="text-xs text-muted-foreground tabular-nums font-mono">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Nombre + distintivo */}
              <div className="flex items-center gap-1 min-w-0">
                <span
                  className={cn(
                    "text-xs font-bold uppercase tracking-wide truncate",
                    isFirst ? "text-yellow-500" : isMe ? "text-primary" : "text-foreground",
                  )}
                >
                  {player.name}
                </span>
                {isMe && (
                  <span className="shrink-0 text-[9px] text-primary/70 uppercase tracking-widest font-mono border border-primary/30 px-1 py-px">
                    TÚ
                  </span>
                )}
                {isFirst && !isMe && (
                  <span className="shrink-0 text-[9px] text-yellow-500/80 uppercase tracking-widest font-mono border border-yellow-500/30 px-1 py-px">
                    1°
                  </span>
                )}
              </div>

              {/* Puntos */}
              <span
                className={cn(
                  "text-sm font-bold tabular-nums font-mono text-right",
                  isFirst ? "text-yellow-500" : isMe ? "text-primary" : "text-foreground",
                  isPromoted && "text-accent",
                )}
              >
                {player.score}
              </span>
            </div>
          )
        })}
      </div>

      {/* Keyframe inline para la animación de subida */}
      <style>{`
        @keyframes rankUp {
          0%   { background-color: oklch(0.6 0.2 145 / 0.18); transform: translateX(3px); }
          40%  { background-color: oklch(0.6 0.2 145 / 0.10); transform: translateX(0); }
          100% { background-color: transparent; }
        }
      `}</style>
    </div>
  )
}
