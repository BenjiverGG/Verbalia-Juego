"use client"

import { cn } from "@/lib/utils"

interface LetterDiceProps {
  letter: string
  isTransitioning?: boolean
}

export function LetterDice({ letter, isTransitioning = false }: LetterDiceProps) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer cube frame */}
      <div className="relative w-32 h-32 border-4 border-foreground">
        {/* Inner perspective lines for 3D effect */}
        <div className="absolute top-0 left-0 w-4 h-4 border-b border-r border-foreground/30" />
        <div className="absolute top-0 right-0 w-4 h-4 border-b border-l border-foreground/30" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-t border-r border-foreground/30" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-t border-l border-foreground/30" />
        
        {/* Letter */}
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "transition-opacity duration-300 ease-in-out",
            isTransitioning ? "opacity-0" : "opacity-100"
          )}
        >
          <span className="text-6xl font-bold text-primary tracking-tight">
            {letter}
          </span>
        </div>
      </div>
      
      {/* Label */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
        <span className="text-xs text-muted-foreground uppercase tracking-widest">
          LETRA ACTUAL
        </span>
      </div>
    </div>
  )
}
