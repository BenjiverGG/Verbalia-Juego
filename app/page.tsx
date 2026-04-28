"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { LobbyScreen } from "@/components/screens/lobby-screen"
import { VotingScreen } from "@/components/screens/voting-screen"
import { ReadyCheckScreen } from "@/components/screens/ready-check-screen"
import { ActiveGameScreen } from "@/components/screens/active-game-screen"
import { ResultsScreen } from "@/components/screens/results-screen"
import { LetterState } from "@/components/game/keyboard"
import { PlayerScore } from "@/components/game/scoreboard"
import { Terminal, Gamepad2, Wifi, WifiOff } from "lucide-react"
import type { GameEvent, GameEventType } from "@/app/api/game/route"

type GameState = "LOBBY" | "VOTING" | "READY_CHECK" | "ACTIVE_GAME" | "RESULTS"

const ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("")

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
  A: { definition: "País sudamericano famoso por el tango, el asado y ser la tierra natal de Maradona y Messi.", answer: "ARGENTINA", type: "empieza" },
  B: { definition: "País sudamericano más grande del continente, conocido por el Carnaval de Río y la selva amazónica.", answer: "BRASIL", type: "empieza" },
  C: { definition: "País sudamericano largo y angosto, famoso por sus vinos, el desierto de Atacama y la Patagonia.", answer: "CHILE", type: "empieza" },
  D: { definition: "País escandinavo conocido por sus diseños, la Sirenita de Copenhague y ser la tierra de los vikingos.", answer: "DINAMARCA", type: "empieza" },
  E: { definition: "País europeo de la península ibérica, famoso por el flamenco, las tapas y la Sagrada Familia.", answer: "ESPAÑA", type: "empieza" },
  F: { definition: "País europeo conocido por la Torre Eiffel, el vino, el queso y la haute couture.", answer: "FRANCIA", type: "empieza" },
  G: { definition: "País europeo cuna de la democracia y la filosofía, con monumentos como el Partenón en Atenas.", answer: "GRECIA", type: "empieza" },
  H: { definition: "País centroamericano con costas en el Caribe y el Pacífico, famoso por sus ruinas mayas de Copán.", answer: "HONDURAS", type: "empieza" },
  I: { definition: "País europeo con forma de bota, cuna del Renacimiento, la pizza y el Coliseo Romano.", answer: "ITALIA", type: "empieza" },
  J: { definition: "País asiático insular conocido por los samuráis, el sushi, el anime y el Monte Fuji.", answer: "JAPÓN", type: "empieza" },
  K: { definition: "País africano famoso por sus safaris, el Monte Kilimanjaro (en su frontera) y los maasáis.", answer: "KENIA", type: "empieza" },
  L: { definition: "Pequeño país europeo sin salida al mar, ubicado entre Bélgica, Francia y Alemania, conocido por sus bancos.", answer: "LUXEMBURGO", type: "empieza" },
  M: { definition: "País norteamericano famoso por sus tacos, mariachis, pirámides aztecas y playas del Caribe.", answer: "MÉXICO", type: "empieza" },
  N: { definition: "País escandinavo de los fiordos, la aurora boreal y las noches polares, tierra de los vikingos.", answer: "NORUEGA", type: "empieza" },
  Ñ: { definition: "País ibérico cuyo nombre contiene la letra más característica del idioma español.", answer: "ESPAÑA", type: "contiene" },
  O: { definition: "Sultanato de la península arábiga, conocido por sus paisajes desérticos y su capital Mascate.", answer: "OMÁN", type: "empieza" },
  P: { definition: "País sudamericano andino, cuna del Imperio Inca, famoso por Machu Picchu y el ceviche.", answer: "PERÚ", type: "empieza" },
  Q: { definition: "Pequeño emirato árabe muy rico en petróleo y gas, sede de la Copa Mundial de Fútbol 2022.", answer: "CATAR", type: "contiene" },
  R: { definition: "País más grande del mundo por territorio, abarca Europa y Asia, conocido por el Kremlin y la Plaza Roja.", answer: "RUSIA", type: "empieza" },
  S: { definition: "País escandinavo conocido por IKEA, ABBA, los premios Nobel y sus extensos bosques.", answer: "SUECIA", type: "empieza" },
  T: { definition: "País transcontinental entre Europa y Asia, famoso por Estambul, la Capadocia y los kebabs.", answer: "TURQUÍA", type: "empieza" },
  U: { definition: "País sudamericano pequeño entre Argentina y Brasil, famoso por su mate y sus playas de Punta del Este.", answer: "URUGUAY", type: "empieza" },
  V: { definition: "País sudamericano caribeño con grandes reservas de petróleo, tierra del Salto Ángel.", answer: "VENEZUELA", type: "empieza" },
  W: { definition: "País africano sin salida al mar, anteriormente llamado Suazilandia, es una monarquía absoluta.", answer: "ESWATINI", type: "contiene" },
  X: { definition: "Pequeño país europeo entre Bélgica, Francia y Alemania, su nombre contiene una X.", answer: "LUXEMBURGO", type: "contiene" },
  Y: { definition: "País de la península arábiga en el extremo sur, conocido por sus antiguas ciudades amuralladas.", answer: "YEMEN", type: "empieza" },
  Z: { definition: "País africano del sur conocido por las Cataratas Victoria y sus safaris de fauna salvaje.", answer: "ZIMBABUE", type: "empieza" },
}

function normalizeAnswer(text: string): string {
  return text.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function getPlayerId(): string {
  let id = sessionStorage.getItem("verbalia_player_id")
  if (!id) {
    id = `player-${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem("verbalia_player_id", id)
  }
  return id
}

function getPlayerName(): string {
  let name = sessionStorage.getItem("verbalia_player_name") ?? ""
  if (!name) {
    name = `Jugador_${Math.random().toString(36).slice(2, 5).toUpperCase()}`
    sessionStorage.setItem("verbalia_player_name", name)
  }
  return name
}

const ROOM_ID = "Verbalia Juego"

// ─────────────────────────────────────────────
// Helper para avanzar letra (reutilizado en 2 lugares)
// ─────────────────────────────────────────────

function advanceLetter(
  currentIndex: number,
  setCurrentLetterIndex: React.Dispatch<React.SetStateAction<number>>,
  setIsTransitioning: React.Dispatch<React.SetStateAction<boolean>>,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  setIsTimerRunning: React.Dispatch<React.SetStateAction<boolean>>,
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>,
  setCurrentTurnHolder: React.Dispatch<React.SetStateAction<string | null>>
) {
  setCurrentTurnHolder(null)
  setIsTransitioning(true)
  setTimeLeft(30)
  setTimeout(() => {
    if (currentIndex < ALPHABET.length - 1) {
      setCurrentLetterIndex(currentIndex + 1)
      setIsTransitioning(false)
    } else {
      setGameState("RESULTS")
      setIsTimerRunning(false)
    }
  }, 500)
}

export default function VerbaliaGame() {
  // FIX HYDRATION: vacío en SSR, se llena en cliente
  const [myId, setMyId] = useState<string>("")
  const [myName, setMyName] = useState<string>("")

  const [gameState, setGameState] = useState<GameState>("LOBBY")
  const [players, setPlayers] = useState<
    Record<string, { name: string; isReady: boolean; isConnected: boolean }>
  >({})
  const [hostId, setHostId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [hasVoted, setHasVoted] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0)
  const [letterStates, setLetterStates] = useState<Record<string, LetterState>>({})
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [scores, setScores] = useState<PlayerScore[]>([])
  const [currentTurnHolder, setCurrentTurnHolder] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // BUG 4: timer de votación visible en la UI
  const [votingTimeLeft, setVotingTimeLeft] = useState<number>(15)
  const [isVotingTimerRunning, setIsVotingTimerRunning] = useState(false)

  const eventSourceRef = useRef<EventSource | null>(null)
  // Ref para acceder al índice actual dentro de callbacks SSE (evita closures stale)
  const currentLetterIndexRef = useRef(currentLetterIndex)
  useEffect(() => { currentLetterIndexRef.current = currentLetterIndex }, [currentLetterIndex])

  const currentLetter = ALPHABET[currentLetterIndex]

  // Paso 1: cargar IDs en el cliente
  useEffect(() => {
    setMyId(getPlayerId())
    setMyName(getPlayerName())
  }, [])

  // ── Emitir eventos ──
  const emitEvent = useCallback(
    async (type: GameEventType, payload?: Record<string, unknown>) => {
      if (!myId) return
      await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          roomId: ROOM_ID,
          playerId: myId,
          playerName: myName,
          payload,
        } satisfies Omit<GameEvent, "timestamp">),
      })
    },
    [myId, myName]
  )

  // ── Procesar mensajes SSE ──
  const handleSSEMessage = useCallback(
    (event: MessageEvent) => {
      const data = JSON.parse(event.data) as GameEvent
      if (data.type === "HEARTBEAT") return

      const payload = data.payload ?? {}

      switch (data.type) {

        case "PLAYER_JOINED":
        case "PLAYER_LEFT": {
          if (payload.players) setPlayers(payload.players as typeof players)
          if (payload.hostId !== undefined) setHostId(payload.hostId as string | null)
          if (payload.gameState) setGameState(payload.gameState as GameState)
          if (payload.currentTurnHolder !== undefined) {
            setCurrentTurnHolder(payload.currentTurnHolder as string | null)
          }
          break
        }

        // BUG 3: jugador expulsado
        case "PLAYER_KICKED": {
          if (payload.players) setPlayers(payload.players as typeof players)
          if (payload.hostId !== undefined) setHostId(payload.hostId as string | null)
          if (payload.currentTurnHolder !== undefined) {
            setCurrentTurnHolder(payload.currentTurnHolder as string | null)
          }
          // Si me expulsaron a mí, recargar
          if ((payload.kicked === true && data.playerId === myId)) {
            window.location.reload()
            return
          }
          break
        }

        // BUG 1: nuevo host
        case "HOST_CHANGED": {
          if (payload.newHostId) setHostId(payload.newHostId as string)
          if (payload.players) setPlayers(payload.players as typeof players)
          break
        }

        case "PLAYER_READY": {
          if (payload.players) setPlayers(payload.players as typeof players)
          if (payload.hostId !== undefined) setHostId(payload.hostId as string | null)
          if (payload.gameState) {
            setGameState(payload.gameState as GameState)
            if (payload.gameState === "ACTIVE_GAME") {
              setIsTimerRunning(true)
              setTimeLeft(30)
              setIsVotingTimerRunning(false)
            }
          }
          break
        }

        case "GAME_STATE_CHANGED": {
          if (payload.gameState) setGameState(payload.gameState as GameState)
          if (payload.hostId !== undefined) setHostId(payload.hostId as string | null)
          if (payload.players) setPlayers(payload.players as typeof players)

          if (payload.gameState === "VOTING") {
            // BUG 4: arrancar timer de votación en el cliente
            setVotingTimeLeft(15)
            setIsVotingTimerRunning(true)
            setHasVoted(false)
            setVotes({})
            setSelectedCategory(null)
          }

          if (payload.gameState === "ACTIVE_GAME") {
            setIsTimerRunning(true)
            setTimeLeft(30)
            setIsVotingTimerRunning(false)
            setScores((prev) => {
              if (prev.length > 0) return prev
              const playersMap = (payload.players ?? {}) as Record<string, { name: string; isReady: boolean; isConnected: boolean }>
              return Object.entries(playersMap).map(([id, p], i) => ({
                id, name: p.name, score: 0, correctAnswers: 0, rank: i + 1,
              }))
            })
          }

          if (payload.gameState === "LOBBY") {
            setSelectedCategory(null)
            setHasVoted(false)
            setVotes({})
            setIsReady(false)
            setCurrentLetterIndex(0)
            setLetterStates({})
            setTimeLeft(30)
            setIsTimerRunning(false)
            setIsVotingTimerRunning(false)
            setVotingTimeLeft(15)
            setCurrentTurnHolder(null)
            setScores([])
          }
          break
        }

        case "VOTE_CAST": {
          if (payload.votes) setVotes(payload.votes as Record<string, number>)
          if (payload.selectedCategory) setSelectedCategory(payload.selectedCategory as string)
          break
        }

        // BUG 4: el servidor decidió la categoría ganadora (timeout o todos votaron)
        case "VOTING_TIMEOUT": {
          setIsVotingTimerRunning(false)
          setVotingTimeLeft(0)
          if (payload.selectedCategory) setSelectedCategory(payload.selectedCategory as string)
          if (payload.votes) setVotes(payload.votes as Record<string, number>)
          if (payload.gameState) setGameState(payload.gameState as GameState)
          break
        }

        case "TURN_REQUESTED": {
          const holder = (payload.currentTurnHolder as string) ?? data.playerId
          setCurrentTurnHolder(holder)
          if (payload.hostId !== undefined) setHostId(payload.hostId as string | null)
          setTimeLeft(30)
          setIsTimerRunning(true)
          break
        }

        case "TURN_RELEASED": {
          setCurrentTurnHolder(null)
          if (payload.hostId !== undefined) setHostId(payload.hostId as string | null)
          break
        }

        case "ANSWER_SUBMITTED": {
          setCurrentTurnHolder(null)
          if (payload.hostId !== undefined) setHostId(payload.hostId as string | null)

          const letter = payload.letter as string | undefined
          const isCorrect = payload.isCorrect as boolean | undefined
          if (letter && typeof isCorrect === "boolean") {
            setLetterStates((prev) => ({ ...prev, [letter]: isCorrect ? "correct" : "error" }))
          }

          if (data.playerId !== myId) {
            if (isCorrect) {
              setScores((prev) => {
                const exists = prev.some((p) => p.id === data.playerId)
                const base = exists
                  ? prev
                  : [...prev, { id: data.playerId, name: data.playerName ?? data.playerId, score: 0, correctAnswers: 0, rank: prev.length + 1 }]
                return base.map((p) =>
                  p.id === data.playerId
                    ? { ...p, score: p.score + 10, correctAnswers: p.correctAnswers + 1 }
                    : p
                )
              })
            }
            // Avanzar letra para los demás jugadores
            advanceLetter(
              currentLetterIndexRef.current,
              setCurrentLetterIndex,
              setIsTransitioning,
              setGameState,
              setIsTimerRunning,
              setTimeLeft,
              setCurrentTurnHolder
            )
          }
          break
        }

        // BUG 2: el servidor indica que el tiempo de la letra terminó
        case "LETTER_TIMEOUT": {
          setCurrentTurnHolder(null)
          // Avanzar letra para TODOS (incluso quien tenía el turno)
          advanceLetter(
            currentLetterIndexRef.current,
            setCurrentLetterIndex,
            setIsTransitioning,
            setGameState,
            setIsTimerRunning,
            setTimeLeft,
            setCurrentTurnHolder
          )
          break
        }
      }
    },
    [myId]
  )

  // Paso 2: abrir SSE cuando myId esté listo
  useEffect(() => {
    if (!myId || !myName) return
    if (eventSourceRef.current) return

    const url = `/api/game?roomId=${ROOM_ID}&playerId=${myId}&playerName=${encodeURIComponent(myName)}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onopen = () => setIsConnected(true)
    es.onerror = () => setIsConnected(false)
    es.onmessage = handleSSEMessage

    return () => {
      es.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }, [myId, myName]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!eventSourceRef.current) return
    eventSourceRef.current.onmessage = handleSSEMessage
  }, [handleSSEMessage])

  // ── BUG 2: Timer de letra — cuando llega a 0, el servidor manda LETTER_TIMEOUT ──
  // El cliente solo necesita mostrar la cuenta regresiva; el servidor es quien avanza.
  useEffect(() => {
    if (!isTimerRunning || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isTimerRunning, timeLeft])

  // ── BUG 4: Timer de votación (visual, 15s) ──
  useEffect(() => {
    if (!isVotingTimerRunning || votingTimeLeft <= 0) return
    const interval = setInterval(() => {
      setVotingTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isVotingTimerRunning, votingTimeLeft])

  // ── Handlers ──

  const handleGoBackToLobby = useCallback(() => {
    emitEvent("GAME_STATE_CHANGED", { gameState: "LOBBY" })
  }, [emitEvent])

  const handleStartGame = useCallback(() => {
    emitEvent("GAME_STATE_CHANGED", { gameState: "VOTING" })
  }, [emitEvent])

  const handleVote = useCallback(
    (category: string) => {
      if (hasVoted) return
      setSelectedCategory(category)
      setHasVoted(true)
      emitEvent("VOTE_CAST", { category })
    },
    [hasVoted, emitEvent]
  )

  const handleToggleReady = useCallback(() => {
    const next = !isReady
    setIsReady(next)
    emitEvent("PLAYER_READY", { isReady: next })
  }, [isReady, emitEvent])

  const handleRequestTurn = useCallback(async () => {
    const res = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "TURN_REQUESTED",
        roomId: ROOM_ID,
        playerId: myId,
        playerName: myName,
      } satisfies Omit<GameEvent, "timestamp">),
    })
    if (!res.ok) console.warn("Turno denegado")
  }, [myId, myName])

  const handleSubmitAnswer = useCallback(
    (answer: string) => {
      const definition = DEFINITIONS[currentLetter]
      const isCorrect = definition
        ? normalizeAnswer(answer) === normalizeAnswer(definition.answer)
        : false

      setLetterStates((prev) => ({
        ...prev,
        [currentLetter]: isCorrect ? "correct" : "error",
      }))

      if (isCorrect) {
        setScores((prev) => {
          const exists = prev.some((p) => p.id === myId)
          const base = exists
            ? prev
            : [...prev, { id: myId, name: myName, score: 0, correctAnswers: 0, rank: prev.length + 1 }]
          return base.map((p) =>
            p.id === myId
              ? { ...p, score: p.score + 10, correctAnswers: p.correctAnswers + 1 }
              : p
          )
        })
      }

      emitEvent("ANSWER_SUBMITTED", {
        answer, isCorrect, letter: currentLetter, letterIndex: currentLetterIndex,
      })

      // Avanzar localmente para quien respondió
      advanceLetter(
        currentLetterIndex,
        setCurrentLetterIndex,
        setIsTransitioning,
        setGameState,
        setIsTimerRunning,
        setTimeLeft,
        setCurrentTurnHolder
      )
    },
    [currentLetter, currentLetterIndex, myId, myName, emitEvent]
  )

  // BUG 3: kick de jugador
  const handleKickPlayer = useCallback(
    (targetPlayerId: string) => {
      if (targetPlayerId === myId) return
      emitEvent("PLAYER_KICKED" as GameEventType, { targetPlayerId })
    },
    [myId, emitEvent]
  )

  const handlePlayAgain = useCallback(() => {
    emitEvent("GAME_STATE_CHANGED", { gameState: "LOBBY" })
  }, [emitEvent])

  // ── Derivados ──
  const playersList = Object.entries(players).map(([id, p]) => ({
    id,
    name: p.name,
    isConnected: p.isConnected,
    isHost: id === hostId,
    isReady: p.isReady,
  }))

  const scoreMap = new Map(scores.map((s) => [s.id, s]))
  const liveScores = Object.entries(players)
    .filter(([, p]) => p.isConnected)
    .map(([id, p], i) => scoreMap.get(id) ?? { id, name: p.name, score: 0, correctAnswers: 0, rank: i + 1 })

  const iAmHost = hostId === myId || (!hostId && playersList[0]?.id === myId)
  const isTurnBlocked = currentTurnHolder !== null && currentTurnHolder !== myId

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-widest">VERBALIA</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-accent" />
                  <span className="text-accent uppercase tracking-widest">EN LÍNEA</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-destructive" />
                  <span className="text-destructive uppercase tracking-widest">DESCONECTADO</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Terminal className="w-4 h-4" />
              <span className="uppercase tracking-widest">{myName || "..."}</span>
            </div>
            {gameState !== "LOBBY" && (
              <button
                type="button"
                onClick={handleGoBackToLobby}
                className="px-4 py-2 bg-secondary text-secondary-foreground border-2 border-border uppercase tracking-widest text-[10px] font-bold rounded-md hover:bg-muted transition"
              >
                VOLVER AL LOBBY
              </button>
            )}
          </div>
        </div>
      </header>

      {/* State Indicator */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-4 overflow-x-auto">
          {(["LOBBY", "VOTING", "READY_CHECK", "ACTIVE_GAME", "RESULTS"] as GameState[]).map((state, index) => (
            <div key={state} className="flex items-center gap-2">
              <div className={`w-2 h-2 ${
                gameState === state ? "bg-primary"
                  : ["LOBBY", "VOTING", "READY_CHECK", "ACTIVE_GAME", "RESULTS"].indexOf(gameState) > index
                    ? "bg-accent" : "bg-muted"
              }`} />
              <span className={`text-xs uppercase tracking-wider whitespace-nowrap ${
                gameState === state ? "text-primary" : "text-muted-foreground"
              }`}>
                {state.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Banner de turno */}
      {gameState === "ACTIVE_GAME" && currentTurnHolder && (
        <div className="border-b border-primary/30 bg-primary/5">
          <div className="max-w-4xl mx-auto px-4 py-2 text-center text-xs text-primary uppercase tracking-widest">
            {currentTurnHolder === myId
              ? "⚡ ES TU TURNO — escribe tu respuesta"
              : `🔒 ${players[currentTurnHolder]?.name ?? "Otro jugador"} está respondiendo...`}
          </div>
        </div>
      )}

      {/* Contenido del juego */}
      <div className="flex-1 flex items-center justify-center p-6">
        {gameState === "LOBBY" && (
          <LobbyScreen
            players={playersList}
            roomCode={ROOM_ID}
            onStartGame={handleStartGame}
            onKickPlayer={handleKickPlayer}
            isHost={iAmHost}
            myId={myId}
          />
        )}

        {gameState === "VOTING" && (
          <VotingScreen
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            votes={votes}
            onVote={handleVote}
            hasVoted={hasVoted}
            // BUG 4: pasar el timer de votación a la pantalla
            timeLeft={votingTimeLeft}
          />
        )}

        {gameState === "READY_CHECK" && (
          <ReadyCheckScreen
            players={playersList.filter((p) => p.isConnected)}
            isReady={isReady}
            category={selectedCategory ?? "PAÍSES DEL MUNDO"}
            onToggleReady={handleToggleReady}
          />
        )}

        {gameState === "ACTIVE_GAME" && (
          <ActiveGameScreen
            currentLetter={currentLetter}
            letterStates={letterStates}
            definition={DEFINITIONS[currentLetter]?.definition ?? "Definición no disponible."}
            category={selectedCategory ?? "PAÍSES DEL MUNDO"}
            timeLeft={timeLeft}
            isTimerRunning={isTimerRunning}
            isTransitioning={isTransitioning}
            letterType={DEFINITIONS[currentLetter]?.type ?? "empieza"}
            onSubmitAnswer={handleSubmitAnswer}
            isTurnBlocked={isTurnBlocked}
            isTurnHolder={currentTurnHolder === myId}
            onRequestTurn={handleRequestTurn}
            scores={liveScores}
            myId={myId}
          />
        )}

        {gameState === "RESULTS" && (
          <ResultsScreen scores={scores} onPlayAgain={handlePlayAgain} />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border p-3">
        <div className="max-w-4xl mx-auto text-center text-xs text-muted-foreground">
          <span className="uppercase tracking-widest">
            {playersList.filter((p) => p.isConnected).length} jugador(es) conectado(s) · {ROOM_ID}
          </span>
        </div>
      </footer>
    </main>
  )
}