"use client"

import { Trophy, Medal, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface PlayerScore {
  id: string
  name: string
  score: number
  correctAnswers: number
  rank: number
}

interface ResultsScreenProps {
  scores: PlayerScore[]
  onPlayAgain: () => void
}

export function ResultsScreen({ scores, onPlayAgain }: ResultsScreenProps) {
  const sortedScores = [...scores].sort((a, b) => b.score - a.score)

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-primary" />
    if (rank === 2) return <Medal className="w-5 h-5 text-foreground" />
    if (rank === 3) return <Medal className="w-5 h-5 text-muted-foreground" />
    return null
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-lg">
      {/* Header */}
      <div className="text-center">
        <span className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">
          FIN DE LA PARTIDA
        </span>
        <h2 className="text-3xl font-bold text-foreground">
          RESULTADOS
        </h2>
      </div>

      {/* Winner Highlight */}
      {sortedScores[0] && (
        <div className="text-center border-2 border-primary p-6 w-full">
          <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
          <span className="text-xs text-muted-foreground uppercase tracking-widest block mb-1">
            GANADOR
          </span>
          <span className="text-2xl font-bold text-primary">
            {sortedScores[0].name}
          </span>
          <span className="text-lg text-foreground block mt-1">
            {sortedScores[0].score} pts
          </span>
        </div>
      )}

      {/* Scores Table */}
      <div className="w-full border-2 border-border">
        {/* Table Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 p-3 border-b-2 border-border text-xs text-muted-foreground uppercase tracking-widest">
          <span>#</span>
          <span>JUGADOR</span>
          <span className="text-right">ACIERTOS</span>
          <span className="text-right">PUNTOS</span>
        </div>

        {/* Table Body */}
        <div className="divide-y-2 divide-border">
          {sortedScores.map((player, index) => (
            <div 
              key={player.id}
              className={cn(
                "grid grid-cols-[auto_1fr_auto_auto] gap-4 p-4 items-center",
                index === 0 && "bg-primary/5"
              )}
            >
              <div className="flex items-center justify-center w-6">
                {getRankIcon(index + 1) || (
                  <span className="text-sm text-muted-foreground">
                    {index + 1}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-sm font-medium truncate",
                index === 0 ? "text-primary" : "text-foreground"
              )}>
                {player.name}
              </span>
              <span className="text-sm text-muted-foreground text-right tabular-nums">
                {player.correctAnswers}
              </span>
              <span className={cn(
                "text-sm font-bold text-right tabular-nums",
                index === 0 ? "text-primary" : "text-foreground"
              )}>
                {player.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Play Again Button */}
      <button
        onClick={onPlayAgain}
        className="w-full px-8 py-4 bg-secondary text-secondary-foreground border-2 border-border font-bold uppercase tracking-wider text-sm hover:bg-muted hover:border-primary transition-all flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        VOLVER A JUGAR
      </button>
    </div>
  )
}
