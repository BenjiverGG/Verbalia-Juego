"use client"

import { useEffect, useState } from "react"

interface InfoPanelProps {
  definition: string
  category: string
  timeLeft: number
  isRunning: boolean
  currentLetter: string
  letterType: "empieza" | "contiene"
}

export function InfoPanel({ definition, category, timeLeft, isRunning, currentLetter, letterType }: InfoPanelProps) {
  const [displayTime, setDisplayTime] = useState(timeLeft)

  useEffect(() => {
    setDisplayTime(timeLeft)
  }, [timeLeft])

  useEffect(() => {
    if (!isRunning) return
    
    const interval = setInterval(() => {
      setDisplayTime((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Timer */}
      <div className="flex items-center justify-between border-2 border-border p-3">
        <span className="text-xs text-muted-foreground uppercase tracking-widest">
          TIEMPO
        </span>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${isRunning ? "bg-accent animate-pulse" : "bg-muted"}`} />
          <span className="text-2xl font-bold text-foreground tabular-nums">
            {formatTime(displayTime)}
          </span>
        </div>
      </div>

      {/* Letter Type Indicator */}
      <div className="border-2 border-primary p-3 bg-primary/10">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-widest">
            PISTA
          </span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">{currentLetter}</span>
          </div>
        </div>
        <div className="mt-2">
          {letterType === "empieza" ? (
            <span className="text-sm text-accent font-bold">
              {">>> LA PALABRA EMPIEZA CON \""}{currentLetter}{"\""}
            </span>
          ) : (
            <span className="text-sm text-secondary font-bold">
              {">>> LA PALABRA CONTIENE \""}{currentLetter}{"\""}
            </span>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="border-2 border-border p-3">
        <span className="text-xs text-muted-foreground uppercase tracking-widest block mb-1">
          CATEGORÍA
        </span>
        <span className="text-sm font-bold text-primary">
          {category}
        </span>
      </div>

      {/* Definition */}
      <div className="border-2 border-border p-4">
        <span className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">
          DEFINICIÓN
        </span>
        <p className="text-sm text-foreground leading-relaxed">
          {definition}
        </p>
      </div>
    </div>
  )
}
