"use client"

/**
 * components/screens/active-game-screen.tsx
 *
 * CAMBIOS: Pasa isTurnBlocked, isTurnHolder y onRequestTurn al TurnButton.
 */

import { LetterDice } from "@/components/game/letter-dice"
import { Keyboard, LetterState } from "@/components/game/keyboard"
import { InfoPanel } from "@/components/game/info-panel"
import { TurnButton } from "@/components/game/turn-button"

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
  /** Props nuevas para sincronización de turno */
  isTurnBlocked?: boolean
  isTurnHolder?: boolean
  onRequestTurn?: () => Promise<void>
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
}: ActiveGameScreenProps) {
  return (
    <div className="flex flex-col items-center gap-10 w-full max-w-xl">
      <InfoPanel
        definition={definition}
        category={category}
        timeLeft={timeLeft}
        isRunning={isTimerRunning}
        currentLetter={currentLetter}
        letterType={letterType}
      />

      <div className="py-4">
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
  )
}