"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { gameSessionsApi } from "@/lib/api"
import { useUser } from "@/lib/user-context"
import { Brain, RotateCcw, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = ["RED", "BLUE", "GREEN", "YELLOW"] as const
type ColorName = typeof COLORS[number]

const COLOR_STYLES: Record<ColorName, string> = {
  RED:    "text-red-500",
  BLUE:   "text-blue-500",
  GREEN:  "text-green-500",
  YELLOW: "text-yellow-400",
}

const BUTTON_STYLES: Record<ColorName, string> = {
  RED:    "bg-red-500 hover:bg-red-600 text-white",
  BLUE:   "bg-blue-500 hover:bg-blue-600 text-white",
  GREEN:  "bg-green-500 hover:bg-green-600 text-white",
  YELLOW: "bg-yellow-400 hover:bg-yellow-500 text-white",
}

const TOTAL_ROUNDS   = 10
const TIME_PER_ROUND = 3000  // ms
const MISMATCH_PROB  = 0.7

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "intro" | "playing" | "feedback" | "results"

interface Round {
  word:         ColorName
  color:        ColorName  // the ink color — this is the correct answer
  options:      ColorName[]
}

interface RoundResult {
  correct:      boolean
  reactionTime: number  // ms, -1 if timed out
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function generateRound(): Round {
  const color = randomFrom(COLORS)
  // 70% mismatch: word ≠ color
  let word: ColorName
  if (Math.random() < MISMATCH_PROB) {
    const others = COLORS.filter((c) => c !== color)
    word = randomFrom(others)
  } else {
    word = color
  }
  return { word, color, options: shuffle([...COLORS]) }
}

function deriveInsight(interferenceScore: number, accuracy: number): string {
  if (interferenceScore > 0.4)  return "High cognitive interference detected. Practice mindfulness and focus exercises."
  if (accuracy > 0.8)           return "Strong cognitive control. Excellent ability to suppress distracting information."
  return "Moderate attention performance. Consistent training will improve response inhibition."
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StroopTestPage() {
  const { selectedUserId } = useUser()
  const router = useRouter()

  const [phase,        setPhase]        = useState<Phase>("intro")
  const [roundIndex,   setRoundIndex]   = useState(0)
  const [round,        setRound]        = useState<Round>(generateRound)
  const [results,      setResults]      = useState<RoundResult[]>([])
  const [lastCorrect,  setLastCorrect]  = useState<boolean | null>(null)
  const [timeLeft,     setTimeLeft]     = useState(TIME_PER_ROUND)
  const [saving,       setSaving]       = useState(false)

  const roundStartRef  = useRef<number>(0)
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const answeredRef    = useRef(false)  // prevent double-answer within a round

  // ── Timer ──────────────────────────────────────────────────────────────────
  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const startTimer = useCallback(() => {
    clearTimer()
    setTimeLeft(TIME_PER_ROUND)
    roundStartRef.current = Date.now()
    answeredRef.current   = false

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          clearTimer()
          // timed out — count as wrong
          recordAnswer(false, -1)
          return 0
        }
        return prev - 100
      })
    }, 100)
  }, [clearTimer]) // eslint-disable-line react-hooks/exhaustive-deps

  // cleanup on unmount
  useEffect(() => () => clearTimer(), [clearTimer])

  // ── Start game ─────────────────────────────────────────────────────────────
  function startGame() {
    setResults([])
    setRoundIndex(0)
    setRound(generateRound())
    setLastCorrect(null)
    setPhase("playing")
  }

  // start timer whenever we enter "playing" with a new round
  useEffect(() => {
    if (phase === "playing") startTimer()
  }, [phase, roundIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Record answer ──────────────────────────────────────────────────────────
  function recordAnswer(correct: boolean, reactionTime: number) {
    if (answeredRef.current) return
    answeredRef.current = true
    clearTimer()

    const result: RoundResult = { correct, reactionTime }
    setLastCorrect(correct)
    setPhase("feedback")

    // brief feedback then advance
    setTimeout(() => {
      const nextResults = [...results, result]
      if (roundIndex + 1 >= TOTAL_ROUNDS) {
        finishGame(nextResults)
      } else {
        setResults(nextResults)
        setRoundIndex((i) => i + 1)
        setRound(generateRound())
        setLastCorrect(null)
        setPhase("playing")
      }
    }, 600)

    // capture results for finishGame closure
    setResults((prev) => [...prev, result])
  }

  function handleChoice(chosen: ColorName) {
    if (phase !== "playing" || answeredRef.current) return
    const rt = Date.now() - roundStartRef.current
    recordAnswer(chosen === round.color, rt)
  }

  // ── Finish ─────────────────────────────────────────────────────────────────
  function finishGame(finalResults: RoundResult[]) {
    clearTimer()
    setPhase("results")
    saveSession(finalResults)
  }

  async function saveSession(finalResults: RoundResult[]) {
    if (!selectedUserId) return
    setSaving(true)
    try {
      const validTimes  = finalResults.filter((r) => r.reactionTime > 0).map((r) => r.reactionTime)
      const correct     = finalResults.filter((r) => r.correct).length
      const accuracy    = correct / TOTAL_ROUNDS
      const avgRT       = validTimes.length ? Math.round(validTimes.reduce((a,b) => a+b,0) / validTimes.length) : 0
      const interference = (TOTAL_ROUNDS - correct) / TOTAL_ROUNDS

      await gameSessionsApi.create({
        user_id:          selectedUserId,
        game_type:        "stroop",
        score:            Math.round(accuracy * 100),
        accuracy,
        avg_reaction_ms:  avgRT,
        duration_seconds: Math.round((TOTAL_ROUNDS * TIME_PER_ROUND) / 1000),
        game_metadata: {
          correct_answers: correct,
          wrong_answers:   TOTAL_ROUNDS - correct,
          interference_score: parseFloat(interference.toFixed(3)),
          avg_reaction_ms:    avgRT,
          total_rounds:       TOTAL_ROUNDS,
        },
      })
    } catch (err) {
      console.error("Failed to save stroop session:", err)
    } finally {
      setSaving(false)
    }
  }

  // ── Derived results ────────────────────────────────────────────────────────
  const correct          = results.filter((r) => r.correct).length
  const accuracy         = results.length ? correct / results.length : 0
  const validTimes       = results.filter((r) => r.reactionTime > 0).map((r) => r.reactionTime)
  const avgRT            = validTimes.length ? Math.round(validTimes.reduce((a,b)=>a+b,0)/validTimes.length) : 0
  const interferenceScore = results.length ? (results.length - correct) / results.length : 0
  const insight          = deriveInsight(interferenceScore, accuracy)

  const progressPct = ((TIME_PER_ROUND - timeLeft) / TIME_PER_ROUND) * 100

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-start min-h-[calc(100vh-80px)] py-8 px-4">

        {/* ── INTRO ── */}
        {phase === "intro" && (
          <div className="w-full max-w-lg text-center space-y-8">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Stroop Test</h1>
              <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
                A clinical cognitive assessment measuring your ability to suppress automatic responses.
              </p>
            </div>

            <Card>
              <CardContent className="p-6 space-y-4 text-left">
                <p className="font-semibold text-foreground">How to play</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">1.</span>
                    A word will appear in a colour — they may not match.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">2.</span>
                    Click the button matching the <strong className="text-foreground">ink colour</strong>, not the word.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">3.</span>
                    You have <strong className="text-foreground">3 seconds</strong> per question.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">4.</span>
                    10 rounds total.
                  </li>
                </ul>

                <div className="rounded-xl bg-muted p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Example — click the ink colour:</p>
                  <p className="text-4xl font-black text-blue-500">RED</p>
                  <p className="text-xs text-muted-foreground mt-2">Correct answer: <strong>BLUE</strong></p>
                </div>
              </CardContent>
            </Card>

            <Button size="lg" className="w-full text-base h-12" onClick={startGame}>
              Start Test
            </Button>

            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Games
            </button>
          </div>
        )}

        {/* ── PLAYING / FEEDBACK ── */}
        {(phase === "playing" || phase === "feedback") && (
          <div className="w-full max-w-lg space-y-6">

            {/* Progress bar + round counter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Round {roundIndex + 1} / {TOTAL_ROUNDS}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {(timeLeft / 1000).toFixed(1)}s
                </span>
              </div>
              {/* time bar */}
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    timeLeft > 1500 ? "bg-green-500" : timeLeft > 800 ? "bg-yellow-400" : "bg-red-500"
                  )}
                  style={{ width: `${100 - progressPct}%` }}
                />
              </div>
              {/* round dots */}
              <div className="flex gap-1 pt-1">
                {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 h-1.5 rounded-full",
                      i < roundIndex
                        ? results[i]?.correct ? "bg-green-500" : "bg-red-400"
                        : i === roundIndex ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Stimulus card */}
            <Card className={cn(
              "transition-all duration-150",
              phase === "feedback" && lastCorrect === true  && "ring-2 ring-green-500 bg-green-50",
              phase === "feedback" && lastCorrect === false && "ring-2 ring-red-500 bg-red-50",
            )}>
              <CardContent className="py-14 flex flex-col items-center gap-4">
                {phase === "feedback" ? (
                  <div className="flex flex-col items-center gap-2">
                    {lastCorrect
                      ? <CheckCircle className="h-12 w-12 text-green-500" />
                      : <XCircle    className="h-12 w-12 text-red-500" />
                    }
                    <p className={cn("text-lg font-semibold", lastCorrect ? "text-green-600" : "text-red-600")}>
                      {lastCorrect ? "Correct!" : "Wrong!"}
                    </p>
                    {!lastCorrect && (
                      <p className="text-sm text-muted-foreground">
                        Ink colour was <strong className={COLOR_STYLES[round.color]}>{round.color}</strong>
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                      What colour is the ink?
                    </p>
                    <p className={cn("text-7xl font-black tracking-tight select-none", COLOR_STYLES[round.color])}>
                      {round.word}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Answer buttons */}
            <div className="grid grid-cols-2 gap-3">
              {round.options.map((opt) => (
                <button
                  key={opt}
                  disabled={phase === "feedback"}
                  onClick={() => handleChoice(opt)}
                  className={cn(
                    "h-14 rounded-xl text-base font-bold transition-all duration-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                    BUTTON_STYLES[opt]
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === "results" && (
          <div className="w-full max-w-lg space-y-6">
            <div className="text-center space-y-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Test Complete</h2>
              <p className="text-muted-foreground text-sm">Stroop Cognitive Assessment Results</p>
            </div>

            {/* Score cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Accuracy",        value: `${Math.round(accuracy * 100)}%`,        sub: `${correct}/${TOTAL_ROUNDS} correct` },
                { label: "Avg Reaction",    value: avgRT > 0 ? `${avgRT}ms` : "—",          sub: "response time" },
                { label: "Interference",    value: `${Math.round(interferenceScore * 100)}%`, sub: "error rate" },
              ].map(({ label, value, sub }) => (
                <Card key={label}>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-black text-primary">{value}</p>
                    <p className="text-xs font-semibold text-foreground mt-0.5">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Round breakdown */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Round Breakdown</p>
                <div className="flex gap-1">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1",
                      )}
                    >
                      <div className={cn(
                        "w-full h-8 rounded-md flex items-center justify-center text-xs font-bold text-white",
                        r.correct ? "bg-green-500" : "bg-red-400"
                      )}>
                        {r.correct ? "✓" : "✗"}
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        {r.reactionTime > 0 ? `${r.reactionTime}` : "–"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-center">numbers = reaction time in ms</p>
              </CardContent>
            </Card>

            {/* AI Insight */}
            <Card className={cn(
              "border-l-4",
              interferenceScore > 0.4
                ? "border-l-yellow-400 bg-yellow-50"
                : accuracy > 0.8
                ? "border-l-green-500 bg-green-50"
                : "border-l-blue-400 bg-blue-50"
            )}>
              <CardContent className="p-4 flex items-start gap-3">
                <Brain className={cn(
                  "h-5 w-5 mt-0.5 shrink-0",
                  interferenceScore > 0.4 ? "text-yellow-600" : accuracy > 0.8 ? "text-green-600" : "text-blue-600"
                )} />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">AI Interpretation</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
                </div>
              </CardContent>
            </Card>

            {saving && (
              <p className="text-center text-xs text-muted-foreground">Saving results…</p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-2" onClick={startGame}>
                <RotateCcw className="h-4 w-4" /> Try Again
              </Button>
              <Button className="flex-1 gap-2" onClick={() => router.push("/games")}>
                <ArrowLeft className="h-4 w-4" /> Back to Games
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
