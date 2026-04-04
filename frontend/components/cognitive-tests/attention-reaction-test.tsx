"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { VoiceVisualizer } from "./voice-visualizer"
import {
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  createSpeechRecognition,
  speak,
  stopSpeaking,
  cleanTranscript,
} from "@/lib/speech"
import { cn } from "@/lib/utils"
import { RotateCcw, Play, AlertCircle, CheckCircle2, XCircle, Timer, Zap } from "lucide-react"

interface Question {
  text: string
  answer: string
  spokenQuestion: string
}

const QUESTIONS: Question[] = [
  { text: "What is 5 + 3?", answer: "8", spokenQuestion: "What is five plus three?" },
  { text: "What is 12 - 7?", answer: "5", spokenQuestion: "What is twelve minus seven?" },
  { text: "What color is the sky?", answer: "blue", spokenQuestion: "What color is the sky?" },
  { text: "How many days in a week?", answer: "7", spokenQuestion: "How many days are in a week?" },
  { text: "What is 4 × 3?", answer: "12", spokenQuestion: "What is four times three?" },
  { text: "What is 20 ÷ 4?", answer: "5", spokenQuestion: "What is twenty divided by four?" },
  { text: "What comes after Thursday?", answer: "friday", spokenQuestion: "What day comes after Thursday?" },
  { text: "What is 9 + 6?", answer: "15", spokenQuestion: "What is nine plus six?" },
  { text: "How many months in a year?", answer: "12", spokenQuestion: "How many months are in a year?" },
  { text: "What is 15 - 8?", answer: "7", spokenQuestion: "What is fifteen minus eight?" },
]

const ROUNDS = 5

interface AttentionReactionTestProps {
  onComplete: (score: number, accuracy: number, avgReactionMs: number, metadata: Record<string, unknown>) => void
}

type Phase = "idle" | "asking" | "listening" | "feedback" | "result"

interface RoundResult {
  question: string
  expected: string
  userAnswer: string
  correct: boolean
  reactionMs: number
}

export function AttentionReactionTest({ onComplete }: AttentionReactionTestProps) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [currentRound, setCurrentRound] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [results, setResults] = useState<RoundResult[]>([])
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [isSupported, setIsSupported] = useState(true)
  const [lastRoundResult, setLastRoundResult] = useState<RoundResult | null>(null)

  const recognitionRef = useRef<any>(null)
  const questionEndTimeRef = useRef<number>(0)
  const speechStartTimeRef = useRef<number>(0)
  const questionsRef = useRef<Question[]>([])
  const startListeningRef = useRef<() => void>(() => {})
  const processAnswerRef = useRef<(answer: string) => void>(() => {})
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasProcessedAnswerRef = useRef(false)

  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported() && isSpeechSynthesisSupported())
    return () => {
      stopSpeaking()
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current)
      }
      recognitionRef.current?.abort?.()
    }
  }, [])

  const shuffleQuestions = useCallback(() => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5)
    questionsRef.current = shuffled.slice(0, ROUNDS)
  }, [])

  const startTest = useCallback(() => {
    shuffleQuestions()
    setResults([])
    setCurrentRound(0)
    setLastRoundResult(null)
    askQuestion(0)
  }, [shuffleQuestions])

  const askQuestion = useCallback((round: number) => {
    const question = questionsRef.current[round]
    setCurrentQuestion(question)
    setCurrentAnswer("")
    setPhase("asking")

    speak({
      text: question.spokenQuestion,
      rate: 0.9,
      onEnd: () => {
        questionEndTimeRef.current = Date.now()
        speechStartTimeRef.current = 0
        startListeningRef.current()
      },
    })
  }, [])

  const startListening = useCallback(() => {
    setPhase("listening")
    hasProcessedAnswerRef.current = false

    const recognition = createSpeechRecognition({
      continuous: false,
      interimResults: true,
      onSpeechStart: () => {
        if (speechStartTimeRef.current === 0) {
          speechStartTimeRef.current = Date.now()
        }
      },
      onResult: (res) => {
        if (res.isFinal) {
          setCurrentAnswer(res.transcript)
          recognition.stop()
          if (stopTimerRef.current) {
            clearTimeout(stopTimerRef.current)
            stopTimerRef.current = null
          }
        } else {
          setCurrentAnswer(res.transcript)
        }
      },
      onEnd: () => {},
      onError: (err) => {
        if (err !== "no-speech") {
          console.error("Speech error:", err)
        }
      },
    })

    recognitionRef.current = recognition
    recognition.start()

    // Auto-stop after 8 seconds
    stopTimerRef.current = setTimeout(() => {
      recognition.stop()
    }, 8000)
  }, [])

  useEffect(() => {
    startListeningRef.current = startListening
  }, [startListening])

  const handleSaveAnswer = useCallback(() => {
    if (phase !== "listening") return
    if (hasProcessedAnswerRef.current) return

    hasProcessedAnswerRef.current = true

    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }

    recognitionRef.current?.stop?.()
    processAnswerRef.current(currentAnswer)
  }, [currentAnswer, phase])

  const processAnswer = useCallback((answer: string) => {
    if (!currentQuestion) return

    const cleaned = cleanTranscript(answer).toLowerCase()
    const expected = currentQuestion.answer.toLowerCase()

    // Flexible matching: check if the answer contains the expected value
    const correct =
      cleaned === expected ||
      cleaned.includes(expected) ||
      // Handle number words
      (expected === "8" && cleaned.includes("eight")) ||
      (expected === "5" && cleaned.includes("five")) ||
      (expected === "7" && cleaned.includes("seven")) ||
      (expected === "12" && cleaned.includes("twelve")) ||
      (expected === "15" && cleaned.includes("fifteen")) ||
      (expected === "friday" && cleaned.includes("friday")) ||
      (expected === "blue" && cleaned.includes("blue"))

    const reactionMs = speechStartTimeRef.current > 0
      ? speechStartTimeRef.current - questionEndTimeRef.current
      : 5000

    const roundResult: RoundResult = {
      question: currentQuestion.text,
      expected: currentQuestion.answer,
      userAnswer: answer || "(no answer)",
      correct,
      reactionMs,
    }

    setLastRoundResult(roundResult)
    setResults((prev) => {
      const newResults = [...prev, roundResult]

      // Check if this was the last round
      if (newResults.length >= ROUNDS) {
        setTimeout(() => showFinalResult(newResults), 2000)
      } else {
        setTimeout(() => {
          setCurrentRound((r) => r + 1)
          askQuestion(newResults.length)
        }, 2000)
      }

      return newResults
    })

    setPhase("feedback")
  }, [currentQuestion, askQuestion])

  useEffect(() => {
    processAnswerRef.current = processAnswer
  }, [processAnswer])

  const showFinalResult = useCallback((allResults: RoundResult[]) => {
    setPhase("result")

    const correctCount = allResults.filter((r) => r.correct).length
    const accuracy = correctCount / allResults.length
    const avgReactionMs = Math.round(
      allResults.reduce((sum, r) => sum + r.reactionMs, 0) / allResults.length
    )

    // Score: 60% accuracy + 40% speed (faster = better, cap at 3s)
    const speedScore = Math.max(0, 100 - (avgReactionMs / 30))
    const score = Math.round(accuracy * 60 + (speedScore / 100) * 40)

    onComplete(score, accuracy, avgReactionMs, {
      rounds: allResults.length,
      correct_count: correctCount,
      results: allResults.map((r) => ({
        question: r.question,
        expected: r.expected,
        user_answer: r.userAnswer,
        correct: r.correct,
        reaction_ms: r.reactionMs,
      })),
    })
  }, [onComplete])

  if (!isSupported) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-3 text-center py-8">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <h3 className="font-semibold text-foreground">Browser Not Supported</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Speech recognition requires Chrome, Edge, or Safari.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Attention & Reaction</CardTitle>
          {phase !== "idle" && phase !== "result" && (
            <Badge variant="secondary">
              Round {currentRound + 1}/{ROUNDS}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Answer questions as quickly and accurately as possible
        </p>
      </CardHeader>
      <CardContent>
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Test Your Reaction Speed</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;ll hear {ROUNDS} questions. Answer each one as quickly as you can.
              </p>
            </div>
            <Button onClick={startTest} size="lg" className="gap-2">
              <Play className="h-4 w-4" /> Start Test
            </Button>
          </div>
        )}

        {phase === "asking" && currentQuestion && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-pulse">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground text-center">{currentQuestion.text}</p>
            <p className="text-sm text-muted-foreground">Listening for the question...</p>
          </div>
        )}

        {phase === "listening" && (
          <div className="flex flex-col items-center gap-6 py-8">
            <p className="text-2xl font-bold text-foreground text-center">{currentQuestion?.text}</p>
            <VoiceVisualizer isRecording={true} size="md" />
            <div className="text-center mt-4">
              <p className="text-sm text-muted-foreground">Speak your answer!</p>
              {currentAnswer && (
                <p className="mt-2 text-lg font-medium text-foreground italic">&quot;{currentAnswer}&quot;</p>
              )}
            </div>
            <Button onClick={handleSaveAnswer} className="gap-2">
              Save Answer
            </Button>
          </div>
        )}

        {phase === "feedback" && lastRoundResult && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full",
              lastRoundResult.correct ? "bg-green-100" : "bg-red-100"
            )}>
              {lastRoundResult.correct ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
            </div>
            <p className={cn(
              "text-lg font-semibold",
              lastRoundResult.correct ? "text-green-600" : "text-red-500"
            )}>
              {lastRoundResult.correct ? "Correct!" : "Incorrect"}
            </p>
            {!lastRoundResult.correct && (
              <p className="text-sm text-muted-foreground">
                Answer was: <span className="font-semibold">{lastRoundResult.expected}</span>
              </p>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              {(lastRoundResult.reactionMs / 1000).toFixed(1)}s reaction time
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className="space-y-6 py-4">
            {/* Score */}
            <div className="flex flex-col items-center gap-3">
              {(() => {
                const correctCount = results.filter((r) => r.correct).length
                const accuracy = results.length > 0 ? correctCount / results.length : 0
                const avgReactionMs = results.length > 0
                  ? Math.round(results.reduce((s, r) => s + r.reactionMs, 0) / results.length)
                  : 0
                const speedScore = Math.max(0, 100 - (avgReactionMs / 30))
                const score = Math.round(accuracy * 60 + (speedScore / 100) * 40)

                return (
                  <>
                    <div className={cn(
                      "flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold",
                      score >= 80 ? "bg-green-100 text-green-700" :
                      score >= 50 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {score}
                    </div>
                    <p className="text-sm text-muted-foreground">Score out of 100</p>

                    <div className="grid grid-cols-3 gap-4 w-full">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{correctCount}/{results.length}</p>
                        <p className="text-xs text-muted-foreground">Correct</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{Math.round(accuracy * 100)}%</p>
                        <p className="text-xs text-muted-foreground">Accuracy</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{(avgReactionMs / 1000).toFixed(1)}s</p>
                        <p className="text-xs text-muted-foreground">Avg Reaction</p>
                      </div>
                    </div>

                    <Progress value={score} className="h-2 w-full" />
                  </>
                )
              })()}
            </div>

            {/* Round-by-round results */}
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    {r.correct ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                    <span className="text-sm text-foreground">{r.question}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span>{r.userAnswer}</span>
                    <Badge variant="outline" className="tabular-nums">
                      {(r.reactionMs / 1000).toFixed(1)}s
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-2">
              <Button onClick={() => { setPhase("idle"); setResults([]); setLastRoundResult(null) }} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Try Again
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
