"use client"

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
  onSubmitAnswer
}: ActiveGameScreenProps) {
  return (
    <div className="flex flex-col items-center gap-10 w-full max-w-xl">
      {/* Info Panel at top */}
      <InfoPanel 
        definition={definition}
        category={category}
        timeLeft={timeLeft}
        isRunning={isTimerRunning}
        currentLetter={currentLetter}
        letterType={letterType}
      />

      {/* Letter Dice */}
      <div className="py-4">
        <LetterDice letter={currentLetter} isTransitioning={isTransitioning} />
      </div>

      {/* Turn Button */}
      <TurnButton onSubmit={onSubmitAnswer} />

      {/* Keyboard */}
      <Keyboard 
        letterStates={letterStates}
        currentLetter={currentLetter}
      />
    </div>
  )
}
