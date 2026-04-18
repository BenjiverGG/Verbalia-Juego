"use client"

import { useState, useCallback, useEffect } from "react"
import { LobbyScreen } from "@/components/screens/lobby-screen"
import { VotingScreen } from "@/components/screens/voting-screen"
import { ReadyCheckScreen } from "@/components/screens/ready-check-screen"
import { ActiveGameScreen } from "@/components/screens/active-game-screen"
import { ResultsScreen } from "@/components/screens/results-screen"
import { LetterState } from "@/components/game/keyboard"
import { Terminal, Gamepad2 } from "lucide-react"

type GameState = "LOBBY" | "VOTING" | "READY_CHECK" | "ACTIVE_GAME" | "RESULTS"

const ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("")

const MOCK_PLAYERS = [
  { id: "1", name: "Jugador_01", isConnected: true, isHost: true, isReady: false },
  { id: "2", name: "Jugador_02", isConnected: true, isHost: false, isReady: false },
  { id: "3", name: "Jugador_03", isConnected: true, isHost: false, isReady: false },
  { id: "4", name: "Jugador_04", isConnected: false, isHost: false, isReady: false },
]

const CATEGORIES = [
  "PAÍSES DEL MUNDO",
  "ANIMALES",
  "CIUDADES",
  "PROFESIONES",
  "COMIDAS Y BEBIDAS",
]

interface WordDefinition {
  definition: string
  answer: string
  type: "empieza" | "contiene"
}

const DEFINITIONS: Record<string, WordDefinition> = {
  A: { 
    definition: "País sudamericano famoso por el tango, el asado y ser la tierra natal de Maradona y Messi.", 
    answer: "ARGENTINA",
    type: "empieza"
  },
  B: { 
    definition: "País sudamericano más grande del continente, conocido por el Carnaval de Río y la selva amazónica.", 
    answer: "BRASIL",
    type: "empieza"
  },
  C: { 
    definition: "País sudamericano largo y angosto, famoso por sus vinos, el desierto de Atacama y la Patagonia.", 
    answer: "CHILE",
    type: "empieza"
  },
  D: { 
    definition: "País escandinavo conocido por sus diseños, la Sirenita de Copenhague y ser la tierra de los vikingos.", 
    answer: "DINAMARCA",
    type: "empieza"
  },
  E: { 
    definition: "País europeo de la península ibérica, famoso por el flamenco, las tapas y la Sagrada Familia.", 
    answer: "ESPAÑA",
    type: "empieza"
  },
  F: { 
    definition: "País europeo conocido por la Torre Eiffel, el vino, el queso y la haute couture.", 
    answer: "FRANCIA",
    type: "empieza"
  },
  G: { 
    definition: "País europeo cuna de la democracia y la filosofía, con monumentos como el Partenón en Atenas.", 
    answer: "GRECIA",
    type: "empieza"
  },
  H: { 
    definition: "País centroamericano con costas en el Caribe y el Pacífico, famoso por sus ruinas mayas de Copán.", 
    answer: "HONDURAS",
    type: "empieza"
  },
  I: { 
    definition: "País europeo con forma de bota, cuna del Renacimiento, la pizza y el Coliseo Romano.", 
    answer: "ITALIA",
    type: "empieza"
  },
  J: { 
    definition: "País asiático insular conocido por los samuráis, el sushi, el anime y el Monte Fuji.", 
    answer: "JAPÓN",
    type: "empieza"
  },
  K: { 
    definition: "País africano famoso por sus safaris, el Monte Kilimanjaro (en su frontera) y los maasáis.", 
    answer: "KENIA",
    type: "empieza"
  },
  L: { 
    definition: "Pequeño país europeo sin salida al mar, ubicado entre Bélgica, Francia y Alemania, conocido por sus bancos.", 
    answer: "LUXEMBURGO",
    type: "empieza"
  },
  M: { 
    definition: "País norteamericano famoso por sus tacos, mariachis, pirámides aztecas y playas del Caribe.", 
    answer: "MÉXICO",
    type: "empieza"
  },
  N: { 
    definition: "País escandinavo de los fiordos, la aurora boreal y las noches polares, tierra de los vikingos.", 
    answer: "NORUEGA",
    type: "empieza"
  },
  Ñ: { 
    definition: "País ibérico cuyo nombre contiene la letra más característica del idioma español.", 
    answer: "ESPAÑA",
    type: "contiene"
  },
  O: { 
    definition: "Sultanato de la península arábiga, conocido por sus paisajes desérticos y su capital Mascate.", 
    answer: "OMÁN",
    type: "empieza"
  },
  P: { 
    definition: "País sudamericano andino, cuna del Imperio Inca, famoso por Machu Picchu y el ceviche.", 
    answer: "PERÚ",
    type: "empieza"
  },
  Q: { 
    definition: "Pequeño emirato árabe muy rico en petróleo y gas, sede de la Copa Mundial de Fútbol 2022.", 
    answer: "CATAR",
    type: "contiene"
  },
  R: { 
    definition: "País más grande del mundo por territorio, abarca Europa y Asia, conocido por el Kremlin y la Plaza Roja.", 
    answer: "RUSIA",
    type: "empieza"
  },
  S: { 
    definition: "País escandinavo conocido por IKEA, ABBA, los premios Nobel y sus extensos bosques.", 
    answer: "SUECIA",
    type: "empieza"
  },
  T: { 
    definition: "País transcontinental entre Europa y Asia, famoso por Estambul, la Capadocia y los kebabs.", 
    answer: "TURQUÍA",
    type: "empieza"
  },
  U: { 
    definition: "País sudamericano pequeño entre Argentina y Brasil, famoso por su mate y sus playas de Punta del Este.", 
    answer: "URUGUAY",
    type: "empieza"
  },
  V: { 
    definition: "País sudamericano caribeño con grandes reservas de petróleo, tierra del Salto Ángel.", 
    answer: "VENEZUELA",
    type: "empieza"
  },
  W: { 
    definition: "País africano sin salida al mar, anteriormente llamado Suazilandia, es una monarquía absoluta.", 
    answer: "ESWATINI",
    type: "contiene"
  },
  X: { 
    definition: "Pequeño país europeo entre Bélgica, Francia y Alemania, su nombre contiene una X.", 
    answer: "LUXEMBURGO",
    type: "contiene"
  },
  Y: { 
    definition: "País de la península arábiga en el extremo sur, conocido por sus antiguas ciudades amuralladas.", 
    answer: "YEMEN",
    type: "empieza"
  },
  Z: { 
    definition: "País africano del sur conocido por las Cataratas Victoria y sus safaris de fauna salvaje.", 
    answer: "ZIMBABUE",
    type: "empieza"
  },
}

export default function VerbaliaGame() {
  const [gameState, setGameState] = useState<GameState>("LOBBY")
  const [players, setPlayers] = useState(MOCK_PLAYERS)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [isReady, setIsReady] = useState(false)
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0)
  const [letterStates, setLetterStates] = useState<Record<string, LetterState>>({})
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [scores, setScores] = useState([
    { id: "1", name: "Jugador_01", score: 0, correctAnswers: 0, rank: 1 },
    { id: "2", name: "Jugador_02", score: 0, correctAnswers: 0, rank: 2 },
    { id: "3", name: "Jugador_03", score: 0, correctAnswers: 0, rank: 3 },
  ])

  const currentLetter = ALPHABET[currentLetterIndex]

  // Auto-advance after voting
  useEffect(() => {
    if (hasVoted && gameState === "VOTING") {
      const timer = setTimeout(() => {
        setGameState("READY_CHECK")
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [hasVoted, gameState])

  // Auto-start game when all ready
  useEffect(() => {
    const allReady = players.filter(p => p.isConnected).every(p => p.isReady)
    if (allReady && gameState === "READY_CHECK" && isReady) {
      const timer = setTimeout(() => {
        setGameState("ACTIVE_GAME")
        setIsTimerRunning(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [players, gameState, isReady])

  const handleStartGame = useCallback(() => {
    setGameState("VOTING")
  }, [])

  const handleVote = useCallback((category: string) => {
    setSelectedCategory(category)
    setVotes(prev => ({
      ...prev,
      [category]: (prev[category] || 0) + 1
    }))
    setHasVoted(true)
  }, [])

  const handleToggleReady = useCallback(() => {
    setIsReady(prev => !prev)
    setPlayers(prev => 
      prev.map(p => p.id === "1" ? { ...p, isReady: !p.isReady } : p)
    )
    
    // Simulate other players becoming ready
    if (!isReady) {
      setTimeout(() => {
        setPlayers(prev => 
          prev.map(p => ({ ...p, isReady: p.isConnected }))
        )
      }, 1000)
    }
  }, [isReady])

  const handleSubmitAnswer = useCallback((answer: string) => {
    // Simulate correct/incorrect answer (70% chance correct for demo)
    const isCorrect = Math.random() > 0.3
    
    setLetterStates(prev => ({
      ...prev,
      [currentLetter]: isCorrect ? "correct" : "error"
    }))

    // Update scores
    if (isCorrect) {
      setScores(prev => 
        prev.map(p => 
          p.id === "1" 
            ? { 
                ...p, 
                score: p.score + 10, 
                correctAnswers: p.correctAnswers + 1 
              } 
            : {
                ...p,
                score: p.score + Math.floor(Math.random() * 15),
                correctAnswers: p.correctAnswers + (Math.random() > 0.4 ? 1 : 0)
              }
        )
      )
    }

    // Transition to next letter
    setIsTransitioning(true)
    setTimeLeft(30)

    setTimeout(() => {
      if (currentLetterIndex < 7) { // Play 8 letters for demo
        setCurrentLetterIndex(prev => prev + 1)
        setIsTransitioning(false)
      } else {
        setGameState("RESULTS")
        setIsTimerRunning(false)
      }
    }, 500)
  }, [currentLetter, currentLetterIndex])

  const handlePlayAgain = useCallback(() => {
    setGameState("LOBBY")
    setSelectedCategory(null)
    setHasVoted(false)
    setVotes({})
    setIsReady(false)
    setCurrentLetterIndex(0)
    setLetterStates({})
    setTimeLeft(30)
    setIsTimerRunning(false)
    setPlayers(MOCK_PLAYERS)
    setScores([
      { id: "1", name: "Jugador_01", score: 0, correctAnswers: 0, rank: 1 },
      { id: "2", name: "Jugador_02", score: 0, correctAnswers: 0, rank: 2 },
      { id: "3", name: "Jugador_03", score: 0, correctAnswers: 0, rank: 3 },
    ])
  }, [])

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-widest">
              VERBALIA
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Terminal className="w-4 h-4" />
            <span className="uppercase tracking-widest">v1.0.0</span>
          </div>
        </div>
      </header>

      {/* State Indicator */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-4 overflow-x-auto">
          {(["LOBBY", "VOTING", "READY_CHECK", "ACTIVE_GAME", "RESULTS"] as GameState[]).map((state, index) => (
            <div key={state} className="flex items-center gap-2">
              <div 
                className={`w-2 h-2 ${
                  gameState === state 
                    ? "bg-primary" 
                    : (["LOBBY", "VOTING", "READY_CHECK", "ACTIVE_GAME", "RESULTS"].indexOf(gameState) > index 
                      ? "bg-accent" 
                      : "bg-muted")
                }`}
              />
              <span className={`text-xs uppercase tracking-wider whitespace-nowrap ${
                gameState === state ? "text-primary" : "text-muted-foreground"
              }`}>
                {state.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Game Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {gameState === "LOBBY" && (
          <LobbyScreen
            players={players}
            roomCode="VERB-2024"
            onStartGame={handleStartGame}
            isHost={true}
          />
        )}

        {gameState === "VOTING" && (
          <VotingScreen
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            votes={votes}
            onVote={handleVote}
            hasVoted={hasVoted}
          />
        )}

        {gameState === "READY_CHECK" && (
          <ReadyCheckScreen
            players={players.filter(p => p.isConnected)}
            isReady={isReady}
            category={selectedCategory || "PAÍSES DEL MUNDO"}
            onToggleReady={handleToggleReady}
          />
        )}

        {gameState === "ACTIVE_GAME" && (
          <ActiveGameScreen
            currentLetter={currentLetter}
            letterStates={letterStates}
            definition={DEFINITIONS[currentLetter]?.definition || "Definición no disponible para esta letra."}
            category={selectedCategory || "PAÍSES DEL MUNDO"}
            timeLeft={timeLeft}
            isTimerRunning={isTimerRunning}
            isTransitioning={isTransitioning}
            letterType={DEFINITIONS[currentLetter]?.type || "empieza"}
            onSubmitAnswer={handleSubmitAnswer}
          />
        )}

        {gameState === "RESULTS" && (
          <ResultsScreen
            scores={scores}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border p-3">
        <div className="max-w-4xl mx-auto text-center text-xs text-muted-foreground">
          <span className="uppercase tracking-widest">
            Sistema de juego en línea
          </span>
        </div>
      </footer>
    </main>
  )
}
