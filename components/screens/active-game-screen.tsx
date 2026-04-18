"use client"

/**
 * components/screens/active-game-screen.tsx
 *
 * CAMBIOS:
 * - Integra el componente <Leaderboard /> como panel lateral.
 * - Recibe `scores` y `myId` para pasarlos al leaderboard.
 * - El layout usa un grid de dos columnas en pantallas medianas:
 *   columna izquierda = juego, columna derecha = marcador.
 */

import { LetterDice } from "@/components/game/letter-dice"
import { Keyboard, LetterState } from "@/components/game/keyboard"
import { InfoPanel } from "@/components/game/info-panel"
import { TurnButton } from "@/components/game/turn-button"
import { Leaderboard } from "@/components/game/leaderboard"

interface LeaderboardEntry {
  id: string
  name: string
  score: number
  correctAnswers: number
}

interface ActiveGameScreenProps {
  currentLetter: string
  letterStates: Record<string, LetterState>
  definition: string
  category: string
  timeLeft: number
  isTimerRunning: boolean
  isTransitioning: boolean
  letterType: "empieza" | "contiene"
  onSubmitAnswer: (answer: string) => void
  /** Props de turno */
  isTurnBlocked?: boolean
  isTurnHolder?: boolean
  onRequestTurn?: () => Promise<void>
  /** Props de leaderboard */
  scores?: LeaderboardEntry[]
  myId?: string
}

export function ActiveGameScreen({
  currentLetter,
  letterStates,
  definition,
  category,
  timeLeft,
  isTimerRunning,
  isTransitioning,
  letterType,
  onSubmitAnswer,
  isTurnBlocked = false,
  isTurnHolder = false,
  onRequestTurn,
  scores = [],
  myId = "",
}: ActiveGameScreenProps) {
  return (
    <div className="flex flex-col lg:flex-row items-start gap-6 w-full max-w-4xl">
      {/* ── Columna principal: juego ── */}
      <div className="flex flex-col items-center gap-8 w-full lg:flex-1">
        <InfoPanel
          definition={definition}
          category={category}
          timeLeft={timeLeft}
          isRunning={isTimerRunning}
          currentLetter={currentLetter}
          letterType={letterType}
        />

        <div className="py-2">
          <LetterDice letter={currentLetter} isTransitioning={isTransitioning} />
        </div>

        <TurnButton
          onSubmit={onSubmitAnswer}
          isTurnBlocked={isTurnBlocked}
          isTurnHolder={isTurnHolder}
          onRequestTurn={onRequestTurn}
        />

        <Keyboard letterStates={letterStates} currentLetter={currentLetter} />
      </div>

      {/* ── Columna lateral: leaderboard ── */}
      <div className="w-full lg:w-56 shrink-0">
        <Leaderboard scores={scores} myId={myId} />
      </div>
    </div>
  )
}
