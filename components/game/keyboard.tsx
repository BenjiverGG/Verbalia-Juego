"use client"

import { cn } from "@/lib/utils"

export type LetterState = "pending" | "active" | "correct" | "error"

interface KeyboardProps {
  letterStates: Record<string, LetterState>
  currentLetter: string
}

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
  ["Z", "X", "C", "V", "B", "N", "M"]
]

export function Keyboard({ letterStates, currentLetter }: KeyboardProps) {
  const getLetterStyle = (letter: string) => {
    const state = letter === currentLetter ? "active" : (letterStates[letter] || "pending")
    
    switch (state) {
      case "active":
        return "bg-primary text-primary-foreground border-primary"
      case "correct":
        return "bg-accent text-accent-foreground border-accent"
      case "error":
        return "bg-destructive text-destructive-foreground border-destructive"
      default:
        return "bg-secondary text-secondary-foreground border-border hover:bg-muted"
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
        ABECEDARIO
      </div>
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {row.map((letter) => (
            <div
              key={letter}
              className={cn(
                "w-9 h-9 flex items-center justify-center",
                "border-2 text-sm font-bold",
                "transition-all duration-200 ease-in-out",
                getLetterStyle(letter)
              )}
            >
              {letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
