"use client"

/**
 * components/game/turn-button.tsx
 *
 * CAMBIOS:
 * - Recibe isTurnBlocked (otro jugador tiene el turno → botón deshabilitado)
 * - Recibe isTurnHolder (yo tengo el turno → mostrar input de respuesta)
 * - onRequestTurn se llama ANTES de mostrar el input, para que el servidor
 *   pueda bloquear a los demás. El input aparece solo si el servidor lo concedió.
 */

import { useState } from "react"
import { Send } from "lucide-react"

interface TurnButtonProps {
  onSubmit: (answer: string) => void
  /** Otro jugador ya tiene el turno → deshabilitar el botón para este jugador */
  isTurnBlocked?: boolean
  /** Este jugador es quien tiene el turno activo (servidor lo confirmó) */
  isTurnHolder?: boolean
  /** Llamar al servidor para pedir el turno */
  onRequestTurn?: () => Promise<void>
  disabled?: boolean
}

export function TurnButton({
  onSubmit,
  isTurnBlocked = false,
  isTurnHolder = false,
  onRequestTurn,
  disabled = false,
}: TurnButtonProps) {
  const [answer, setAnswer] = useState("")
  const [isRequesting, setIsRequesting] = useState(false)

  const handleRequestTurn = async () => {
    if (!onRequestTurn) return
    setIsRequesting(true)
    try {
      await onRequestTurn()
      // El input aparecerá automáticamente cuando isTurnHolder cambie a true
      // (el servidor hace broadcast del evento TURN_REQUESTED)
    } finally {
      setIsRequesting(false)
    }
  }

  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmit(answer.trim())
      setAnswer("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit()
  }

  // ── Modo input: el servidor confirmó que tengo el turno ──
  if (isTurnHolder) {
    return (
      <div className="flex gap-2 w-full max-w-md">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu respuesta..."
          autoFocus
          className="flex-1 px-4 py-3 bg-input border-2 border-primary text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors"
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

  // ── Modo botón ──
  const isDisabled = disabled || isTurnBlocked || isRequesting

  return (
    <button
      onClick={handleRequestTurn}
      disabled={isDisabled}
      className="px-8 py-4 bg-secondary text-secondary-foreground border-2 border-border font-bold uppercase tracking-wider text-sm hover:bg-muted hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
    >
      {isRequesting
        ? "SOLICITANDO..."
        : isTurnBlocked
          ? "TURNO OCUPADO"
          : "PEDIR TURNO"}
    </button>
  )
}