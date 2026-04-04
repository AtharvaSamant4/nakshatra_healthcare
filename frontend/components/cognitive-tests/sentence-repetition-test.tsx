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
  sentenceSimilarity,
  tokenize,
} from "@/lib/speech"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { RotateCcw, Play, AlertCircle, Volume2, CheckCircle2, XCircle, Keyboard } from "lucide-react"

const SENTENCES = [
  // Easy (short)
  "The cat sat on the mat.",
  "I like to eat apples.",
  "The sun is very bright today.",
  // Medium
  "The children played happily in the park after school.",
  "She went to the store to buy some fresh vegetables.",
  "The old man walked slowly along the river bank.",
  // Hard (long/complex)
  "The quick brown fox jumped over the lazy dog sleeping in the garden.",
  "After finishing his homework, the boy decided to go outside and ride his bicycle.",
  "The beautiful flowers in the garden attracted many colorful butterflies and busy bees.",
  "Despite the heavy rain, they continued walking through the forest to reach the cabin.",
]

const ROUNDS = 5

interface SentenceRepetitionTestProps {
  onComplete: (score: number, accuracy: number, avgSimilarity: number, metadata: Record<string, unknown>) => void
}

type Phase = "idle" | "speaking" | "listening" | "feedback" | "result"

interface RoundResult {
  original: string
  repeated: string
  similarity: number
}

export function SentenceRepetitionTest({ onComplete }: SentenceRepetitionTestProps) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [currentRound, setCurrentRound] = useState(0)
  const [currentSentence, setCurrentSentence] = useState("")
  const [transcript, setTranscript] = useState("")
  const [results, setResults] = useState<RoundResult[]>([])
  const [lastRoundResult, setLastRoundResult] = useState<RoundResult | null>(null)
  const [isSupported, setIsSupported] = useState(true)
  const [speechFailed, setSpeechFailed] = useState(false)
  const [speechFailReason, setSpeechFailReason] = useState<"mic" | "network">("network")
  const [manualInput, setManualInput] = useState("")

  const recognitionRef = useRef<any>(null)
  const sentencesRef = useRef<string[]>([])

  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported() && isSpeechSynthesisSupported())
    return () => {
      stopSpeaking()
      recognitionRef.current?.abort?.()
    }
  }, [])

  const selectSentences = useCallback(() => {
    // Progressive difficulty: mix easy, medium, hard
    const shuffled = [...SENTENCES].sort(() => Math.random() - 0.5)
    // Sort by length for progressive difficulty
    const sorted = shuffled.slice(0, ROUNDS).sort((a, b) => a.length - b.length)
    sentencesRef.current = sorted
  }, [])

  const startTest = useCallback(() => {
    selectSentences()
    setResults([])
    setCurrentRound(0)
    setLastRoundResult(null)
    presentSentence(0)
  }, [selectSentences])

  const presentSentence = useCallback((round: number) => {
    const sentence = sentencesRef.current[round]
    setCurrentSentence(sentence)
    setTranscript("")
    setPhase("speaking")

    speak({
      text: sentence,
      rate: 0.85,
      onEnd: () => {
        setTimeout(() => startListening(), 500)
      },
    })
  }, [])

  const startListening = useCallback(async () => {
    setPhase("listening")
    setSpeechFailed(false)
    setManualInput("")

    // Pre-check mic permission
    try {
      const perm = await navigator.permissions.query({ name: "microphone" as PermissionName })
      if (perm.state === "denied") {
        setSpeechFailReason("mic")
        setSpeechFailed(true)
        return
      }
    } catch {
      // permissions API not supported — proceed
    }
    let finalTranscript = ""

    const recognition = createSpeechRecognition({
      continuous: true,
      interimResults: true,
      onResult: (res) => {
        if (res.isFinal) {
          finalTranscript += " " + res.transcript
          setTranscript(finalTranscript.trim())
        } else {
          setTranscript((finalTranscript + " " + res.transcript).trim())
        }
      },
      onEnd: () => {
        // Will be stopped manually or auto
      },
      onError: (err) => {
        if (err === "not-allowed" || err === "audio-capture") {
          recognitionRef.current?.abort?.()
          setSpeechFailReason("mic")
          setSpeechFailed(true)
        } else if (err === "network") {
          recognitionRef.current?.abort?.()
          setSpeechFailReason("network")
          setSpeechFailed(true)
        } else if (err !== "no-speech" && err !== "aborted") {
          console.error("Speech error:", err)
        }
      },
    })

    recognitionRef.current = recognition
    recognition.start()

    // Auto-stop after 15 seconds
    setTimeout(() => {
      finishListening()
    }, 15000)
  }, [])

  const finishListening = useCallback(() => {
    recognitionRef.current?.stop?.()

    setTimeout(() => {
      const userTranscript = transcript
      const similarity = sentenceSimilarity(currentSentence, userTranscript)

      const roundResult: RoundResult = {
        original: currentSentence,
        repeated: userTranscript || "(no response)",
        similarity,
      }

      setLastRoundResult(roundResult)
      setResults((prev) => {
        const newResults = [...prev, roundResult]

        if (newResults.length >= ROUNDS) {
          setTimeout(() => showFinalResult(newResults), 2500)
        } else {
          setTimeout(() => {
            setCurrentRound((r) => r + 1)
            presentSentence(newResults.length)
          }, 2500)
        }

        return newResults
      })

      setPhase("feedback")
    }, 500)
  }, [transcript, currentSentence, presentSentence])

  const showFinalResult = useCallback((allResults: RoundResult[]) => {
    setPhase("result")

    const avgSimilarity = allResults.reduce((s, r) => s + r.similarity, 0) / allResults.length
    const score = Math.round(avgSimilarity * 100)
    const accuracy = avgSimilarity

    onComplete(score, accuracy, avgSimilarity, {
      rounds: allResults.length,
      results: allResults.map((r) => ({
        original: r.original,
        repeated: r.repeated,
        similarity: r.similarity,
      })),
    })
  }, [onComplete])

  // Highlight differences between original and repeated
  const renderComparison = useCallback((original: string, repeated: string) => {
    const origTokens = tokenize(original)
    const repTokens = new Set(tokenize(repeated))

    return (
      <p className="text-sm leading-relaxed">
        {origTokens.map((word, i) => (
          <span
            key={i}
            className={cn(
              "mr-1",
              repTokens.has(word) ? "text-green-600 font-medium" : "text-red-500 line-through"
            )}
          >
            {word}
          </span>
        ))}
      </p>
    )
  }, [])

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
          <CardTitle className="text-lg font-semibold">Sentence Repetition</CardTitle>
          {phase !== "idle" && phase !== "result" && (
            <Badge variant="secondary">
              Sentence {currentRound + 1}/{ROUNDS}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Listen to each sentence and repeat it as accurately as possible
        </p>
      </CardHeader>
      <CardContent>
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Volume2 className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Sentence Repetition Test</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;ll hear {ROUNDS} sentences of increasing difficulty. Repeat each one after hearing it.
              </p>
            </div>
            <Button onClick={startTest} size="lg" className="gap-2">
              <Play className="h-4 w-4" /> Start Test
            </Button>
          </div>
        )}

        {phase === "speaking" && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-pulse">
              <Volume2 className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-foreground text-center">Listen carefully...</p>
            <p className="text-sm text-muted-foreground text-center italic max-w-md">
              &quot;{currentSentence}&quot;
            </p>
          </div>
        )}

        {phase === "listening" && (
          <div className="flex flex-col items-center gap-6 py-8">
            {speechFailed ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <Keyboard className="h-6 w-6 text-amber-600" />
                </div>
                <p className="text-base font-semibold text-foreground">
                  {speechFailReason === "mic" ? "Microphone Access Denied" : "Voice Recognition Unavailable"}
                </p>
                {speechFailReason === "mic" ? (
                  <p className="text-sm text-muted-foreground max-w-md text-center">
                    Enable microphone in browser settings and reload, or type the sentence below
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground max-w-md text-center">
                    Speech-to-text needs an internet connection. Type the sentence below instead.
                  </p>
                )}
                <p className="text-sm text-muted-foreground italic max-w-md text-center">
                  &quot;{currentSentence}&quot;
                </p>
                <Textarea
                  autoFocus
                  className="w-full max-w-sm"
                  rows={2}
                  placeholder="Type the sentence here..."
                  value={manualInput}
                  onChange={(e) => { setManualInput(e.target.value); setTranscript(e.target.value) }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finishListening() } }}
                />
                <Button onClick={finishListening} disabled={!manualInput.trim()} className="gap-2">
                  Submit
                </Button>
              </>
            ) : (
              <>
                <VoiceVisualizer isRecording={true} size="md" />
                <div className="text-center mt-4">
                  <p className="text-lg font-semibold text-foreground">Now repeat the sentence!</p>
                  {transcript && (
                    <p className="mt-3 text-sm text-muted-foreground italic max-w-md">
                      &quot;{transcript}&quot;
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button onClick={finishListening} variant="destructive" className="gap-2">
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

        {phase === "feedback" && lastRoundResult && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full",
              lastRoundResult.similarity >= 0.8 ? "bg-green-100" :
              lastRoundResult.similarity >= 0.5 ? "bg-yellow-100" :
              "bg-red-100"
            )}>
              {lastRoundResult.similarity >= 0.8 ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : lastRoundResult.similarity >= 0.5 ? (
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
            </div>
            <p className="text-lg font-semibold text-foreground">
              {Math.round(lastRoundResult.similarity * 100)}% match
            </p>
            <div className="w-full max-w-md space-y-2">
              <p className="text-xs text-muted-foreground">Word match:</p>
              {renderComparison(lastRoundResult.original, lastRoundResult.repeated)}
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-3">
              {(() => {
                const avgSimilarity = results.reduce((s, r) => s + r.similarity, 0) / results.length
                const score = Math.round(avgSimilarity * 100)

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
                    <Progress value={score} className="h-2 w-full" />
                  </>
                )
              })()}
            </div>

            {/* Result cards */}
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sentence {i + 1}</span>
                    <Badge
                      variant={r.similarity >= 0.8 ? "default" : r.similarity >= 0.5 ? "secondary" : "destructive"}
                    >
                      {Math.round(r.similarity * 100)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground">&quot;{r.original}&quot;</p>
                  <p className="text-xs text-muted-foreground italic">You said: &quot;{r.repeated}&quot;</p>
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
