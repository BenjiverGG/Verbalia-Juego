"use client"

import { useState } from "react"
import { Send } from "lucide-react"

interface TurnButtonProps {
  onSubmit: (answer: string) => void
  disabled?: boolean
}

export function TurnButton({ onSubmit, disabled = false }: TurnButtonProps) {
  const [isInputMode, setIsInputMode] = useState(false)
  const [answer, setAnswer] = useState("")

  const handleRequestTurn = () => {
    setIsInputMode(true)
  }

  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmit(answer.trim())
      setAnswer("")
      setIsInputMode(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    } else if (e.key === "Escape") {
      setIsInputMode(false)
      setAnswer("")
    }
  }

  if (isInputMode) {
    return (
      <div className="flex gap-2 w-full max-w-md">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu respuesta..."
          autoFocus
          className="flex-1 px-4 py-3 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
        />
        <button
          onClick={handleSubmit}
          disabled={!answer.trim()}
          className="px-6 py-3 bg-primary text-primary-foreground border-2 border-primary font-bold uppercase tracking-wider text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          ENVIAR
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleRequestTurn}
      disabled={disabled}
      className="px-8 py-4 bg-secondary text-secondary-foreground border-2 border-border font-bold uppercase tracking-wider text-sm hover:bg-muted hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      PEDIR TURNO
    </button>
  )
}
