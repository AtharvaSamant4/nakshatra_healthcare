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
  compareWords,
} from "@/lib/speech"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { RotateCcw, Play, Volume2, CheckCircle2, XCircle, AlertCircle, Keyboard } from "lucide-react"

const WORD_LISTS = {
  easy: [
    ["apple", "chair", "river"],
    ["blue", "seven", "house"],
    ["dog", "table", "rain"],
  ],
  medium: [
    ["sunset", "garden", "pencil", "bridge", "ocean"],
    ["mountain", "candle", "forest", "window", "silver"],
    ["basket", "summer", "violin", "planet", "anchor"],
  ],
  hard: [
    ["telescope", "calendar", "umbrella", "dinosaur", "blanket", "keyboard", "elephant"],
    ["chocolate", "butterfly", "adventure", "hospital", "magazine", "celebrate", "sandwich"],
  ],
}

interface MemoryRecallTestProps {
  onComplete: (score: number, accuracy: number, responseTimeMs: number, metadata: Record<string, unknown>) => void
}

type Phase = "idle" | "presenting" | "waiting" | "recording" | "result"
type Difficulty = "easy" | "medium" | "hard"

export function MemoryRecallTest({ onComplete }: MemoryRecallTestProps) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [difficulty, setDifficulty] = useState<Difficulty>("easy")
  const [currentWords, setCurrentWords] = useState<string[]>([])
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [result, setResult] = useState<{
    correct: string[]
    missed: string[]
    extra: string[]
    orderScore: number
    score: number
    accuracy: number
    responseTimeMs: number
  } | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [showWords, setShowWords] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [speechFailed, setSpeechFailed] = useState(false)
  const [manualInput, setManualInput] = useState("")

  const recognitionRef = useRef<any>(null)
  const speechStartTimeRef = useRef<number>(0)
  const questionEndTimeRef = useRef<number>(0)
  const responseTimeRef = useRef<number>(0)

  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported() && isSpeechSynthesisSupported())
    return () => {
      stopSpeaking()
      recognitionRef.current?.abort?.()
    }
  }, [])

  const getRandomList = useCallback((diff: Difficulty) => {
    const lists = WORD_LISTS[diff]
    return [...lists[Math.floor(Math.random() * lists.length)]]
  }, [])

  const startTest = useCallback(() => {
    const words = getRandomList(difficulty)
    setCurrentWords(words)
    setTranscript("")
    setInterimTranscript("")
    setResult(null)
    setPhase("presenting")
    setShowWords(true)

    // Speak the words
    const wordText = words.join(", ")
    speak({
      text: `Remember these words: ${wordText}`,
      rate: 0.8,
      onEnd: () => {
        setShowWords(false)
        setPhase("waiting")
        // Countdown before recording
        let count = 3
        setCountdown(count)
        const timer = setInterval(() => {
          count--
          setCountdown(count)
          if (count <= 0) {
            clearInterval(timer)
            startRecording()
          }
        }, 1000)
      },
    })
  }, [difficulty, getRandomList])

  const startRecording = useCallback(() => {
    setPhase("recording")
    questionEndTimeRef.current = Date.now()
    let finalTranscript = ""

    const recognition = createSpeechRecognition({
      continuous: true,
      interimResults: true,
      onSpeechStart: () => {
        if (speechStartTimeRef.current === 0) {
          speechStartTimeRef.current = Date.now()
          responseTimeRef.current = speechStartTimeRef.current - questionEndTimeRef.current
        }
      },
      onResult: (res) => {
        if (res.isFinal) {
          finalTranscript += " " + res.transcript
          setTranscript(finalTranscript.trim())
          setInterimTranscript("")
        } else {
          setInterimTranscript(res.transcript)
        }
      },
      onEnd: () => {
        // Auto-finalize
      },
      onError: (err) => {
        if (err === "network") {
          recognitionRef.current?.abort?.()
          setSpeechFailed(true)
        } else {
          console.error("Speech recognition error:", err)
        }
      },
    })

    recognitionRef.current = recognition
    recognition.start()
    speechStartTimeRef.current = 0

    // Auto-stop after 15 seconds
    setTimeout(() => {
      finishRecording()
    }, 15000)
  }, [])

  const submitManual = useCallback(() => {
    setTranscript(manualInput)
    setTimeout(() => finishRecording(), 50)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualInput])

  const finishRecording = useCallback(() => {
    recognitionRef.current?.stop?.()

    setTimeout(() => {
      setPhase("result")

      const fullTranscript = transcript || interimTranscript
      const cleanedTranscript = cleanTranscript(fullTranscript)
      const spokenWords = cleanedTranscript.split(/\s+/).filter((w) => w.length > 0)

      const comparison = compareWords(currentWords, spokenWords)
      const accuracy = currentWords.length > 0
        ? comparison.correct.length / currentWords.length
        : 0
      const score = Math.round(
        (accuracy * 0.7 + comparison.orderScore * 0.3) * 100
      )
      const responseTimeMs = responseTimeRef.current || 0

      const resultData = {
        ...comparison,
        score,
        accuracy,
        responseTimeMs,
      }
      setResult(resultData)

      onComplete(score, accuracy, responseTimeMs, {
        difficulty,
        words_presented: currentWords,
        words_recalled: spokenWords,
        correct: comparison.correct,
        missed: comparison.missed,
        extra: comparison.extra,
        order_score: comparison.orderScore,
        transcript: fullTranscript,
      })
    }, 500)
  }, [transcript, interimTranscript, currentWords, difficulty, onComplete])

  if (!isSupported) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-3 text-center py-8">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <h3 className="font-semibold text-foreground">Browser Not Supported</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Speech recognition requires Chrome, Edge, or Safari. Please switch to a supported browser.
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
          <CardTitle className="text-lg font-semibold">Memory Recall</CardTitle>
          <div className="flex items-center gap-2">
            {["easy", "medium", "hard"].map((d) => (
              <Button
                key={d}
                variant={difficulty === d ? "default" : "outline"}
                size="sm"
                onClick={() => setDifficulty(d as Difficulty)}
                disabled={phase !== "idle" && phase !== "result"}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Listen to the words, wait for the countdown, then repeat them back
        </p>
      </CardHeader>
      <CardContent>
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Volume2 className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Ready to Test Your Memory?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;ll hear {difficulty === "easy" ? "3" : difficulty === "medium" ? "5" : "7"} words.
                Repeat them back after a short delay.
              </p>
            </div>
            <Button onClick={startTest} size="lg" className="gap-2">
              <Play className="h-4 w-4" /> Start Test
            </Button>
          </div>
        )}

        {phase === "presenting" && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-pulse">
              <Volume2 className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-semibold text-foreground">Listen carefully...</p>
            {showWords && (
              <div className="flex flex-wrap justify-center gap-3">
                {currentWords.map((word, i) => (
                  <Badge key={i} variant="secondary" className="text-base px-4 py-2 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 200}ms` }}>
                    {word}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === "waiting" && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
              <span className="text-4xl font-bold text-accent">{countdown}</span>
            </div>
            <p className="text-lg font-medium text-muted-foreground">Get ready to speak...</p>
          </div>
        )}

        {phase === "recording" && (
          <div className="flex flex-col items-center gap-6 py-8">
            {speechFailed ? (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                  <Keyboard className="h-7 w-7 text-amber-600" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-foreground">Microphone unavailable</p>
                  <p className="mt-1 text-sm text-muted-foreground">Type the words you remember, separated by spaces or commas</p>
                </div>
                <Textarea
                  className="w-full max-w-sm"
                  rows={3}
                  placeholder="e.g. apple chair river"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitManual() } }}
                />
                <Button onClick={submitManual} disabled={!manualInput.trim()} className="gap-2">
                  Submit Answer
                </Button>
              </>
            ) : (
              <>
                <VoiceVisualizer isRecording={true} size="lg" />
                <div className="text-center mt-4">
                  <p className="text-lg font-semibold text-foreground">Say the words now!</p>
                  {(transcript || interimTranscript) && (
                    <p className="mt-3 text-sm text-muted-foreground italic">
                      &quot;{transcript} {interimTranscript}&quot;
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button onClick={finishRecording} variant="destructive" className="gap-2">
                    Done Speaking
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { recognitionRef.current?.abort?.(); setSpeechFailed(true) }}>
                    Type instead
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {phase === "result" && result && (
          <div className="space-y-6 py-4">
            {/* Score */}
            <div className="flex flex-col items-center gap-3">
              <div className={cn(
                "flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold",
                result.score >= 80 ? "bg-green-100 text-green-700" :
                result.score >= 50 ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              )}>
                {result.score}
              </div>
              <p className="text-sm text-muted-foreground">Score out of 100</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{result.correct.length}/{currentWords.length}</p>
                <p className="text-xs text-muted-foreground">Words Correct</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{Math.round(result.accuracy * 100)}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {result.responseTimeMs > 0 ? `${(result.responseTimeMs / 1000).toFixed(1)}s` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Response Time</p>
              </div>
            </div>

            <Progress value={result.score} className="h-2" />

            {/* Details */}
            <div className="space-y-3">
              {result.correct.length > 0 && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Correct: {result.correct.join(", ")}</p>
                  </div>
                </div>
              )}
              {result.missed.length > 0 && (
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Missed: {result.missed.join(", ")}</p>
                  </div>
                </div>
              )}
              {result.extra.length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Extra words: {result.extra.join(", ")}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-2">
              <Button onClick={() => { setPhase("idle"); setResult(null) }} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Try Again
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
