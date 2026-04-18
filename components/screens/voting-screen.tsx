"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface VotingScreenProps {
  categories: string[]
  selectedCategory: string | null
  votes: Record<string, number>
  onVote: (category: string) => void
  hasVoted: boolean
}

export function VotingScreen({ 
  categories, 
  selectedCategory, 
  votes, 
  onVote, 
  hasVoted 
}: VotingScreenProps) {
  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md">
      {/* Header */}
      <div className="text-center">
        <span className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">
          FASE DE VOTACIÓN
        </span>
        <h2 className="text-2xl font-bold text-foreground">
          Elige una temática
        </h2>
      </div>

      {/* Categories */}
      <div className="w-full space-y-2">
        {categories.map((category) => {
          const voteCount = votes[category] || 0
          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0
          const isSelected = selectedCategory === category

          return (
            <button
              key={category}
              onClick={() => onVote(category)}
              disabled={hasVoted}
              className={cn(
                "w-full relative overflow-hidden border-2 transition-all",
                isSelected 
                  ? "border-primary bg-primary/10" 
                  : "border-border hover:border-muted-foreground",
                hasVoted && "cursor-default"
              )}
            >
              {/* Vote bar background */}
              {hasVoted && (
                <div 
                  className="absolute inset-y-0 left-0 bg-secondary transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              )}
              
              <div className="relative flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                  <span className={cn(
                    "text-sm font-bold uppercase tracking-wider",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {category}
                  </span>
                </div>
                
                {hasVoted && (
                  <span className="text-xs text-muted-foreground">
                    {voteCount} {voteCount === 1 ? "voto" : "votos"}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Status */}
      <div className="text-center text-sm text-muted-foreground">
        {hasVoted 
          ? "Esperando a los demás jugadores..." 
          : "Selecciona una categoría para votar"
        }
      </div>
    </div>
  )
}
