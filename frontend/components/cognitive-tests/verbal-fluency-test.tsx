"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { VoiceVisualizer } from "./voice-visualizer"
import {
  isSpeechRecognitionSupported,
  createSpeechRecognition,
  cleanTranscript,
} from "@/lib/speech"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { RotateCcw, Play, AlertCircle, Clock, Hash, Keyboard } from "lucide-react"

const CATEGORIES = [
  { name: "Animals", prompt: "Name as many animals as you can" },
  { name: "Fruits", prompt: "Name as many fruits as you can" },
  { name: "Countries", prompt: "Name as many countries as you can" },
  { name: "Colors", prompt: "Name as many colors as you can" },
]

const DURATION = 30 // seconds

interface VerbalFluencyTestProps {
  onComplete: (score: number, accuracy: number, wordCount: number, metadata: Record<string, unknown>) => void
}

type Phase = "idle" | "recording" | "result"

export function VerbalFluencyTest({ onComplete }: VerbalFluencyTestProps) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [category, setCategory] = useState(CATEGORIES[0])
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [words, setWords] = useState<string[]>([])
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [isSupported, setIsSupported] = useState(true)
  const [speechFailed, setSpeechFailed] = useState(false)
  const [typingInput, setTypingInput] = useState("")
  const [result, setResult] = useState<{
    uniqueWords: string[]
    duplicates: string[]
    wordsPerSecond: number
    score: number
  } | null>(null)

  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const allWordsRef = useRef<string[]>([])
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported())
    return () => {
      recognitionRef.current?.abort?.()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const processTranscript = useCallback((text: string) => {
    const cleaned = cleanTranscript(text)
    const newWords = cleaned.split(/[\s,]+/).filter((w) => w.length > 1)
    if (newWords.length > 0) {
      allWordsRef.current = [...allWordsRef.current, ...newWords]
      setWords([...allWordsRef.current])
    }
  }, [])

  const startTest = useCallback(() => {
    setPhase("recording")
    setTimeLeft(DURATION)
    setWords([])
    setResult(null)
    setCurrentTranscript("")
    allWordsRef.current = []
    startTimeRef.current = Date.now()

    // Start speech recognition
    const recognition = createSpeechRecognition({
      continuous: true,
      interimResults: true,
      onResult: (res) => {
        if (res.isFinal) {
          processTranscript(res.transcript)
          setCurrentTranscript("")
        } else {
          setCurrentTranscript(res.transcript)
        }
      },
      onEnd: () => {
        // Restart if still recording (SR can auto-stop)
        if (phase === "recording" && timerRef.current) {
          try {
            recognition.start()
          } catch {
            // Ignore if already started
          }
        }
      },
      onError: (err) => {
        if (err === "network") {
          recognitionRef.current?.abort?.()
          setSpeechFailed(true)
        } else if (err !== "aborted" && err !== "no-speech") {
          console.error("Speech recognition error:", err)
        }
      },
    })

    recognitionRef.current = recognition
    recognition.start()

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finishTest()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [phase, processTranscript])

  const handleTypingInput = useCallback((value: string) => {
    // When user types a space or comma, treat the previous word as spoken
    if (value.endsWith(" ") || value.endsWith(",")) {
      const word = value.trim().replace(/,$/, "")
      if (word.length > 1) {
        processTranscript(word)
      }
      setTypingInput("")
    } else {
      setTypingInput(value)
    }
  }, [processTranscript])

  const finishTest = useCallback(() => {
    recognitionRef.current?.stop?.()
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setTimeout(() => {
      const allWords = allWordsRef.current.map((w) => w.toLowerCase())
      const uniqueWords = [...new Set(allWords)]
      const duplicates = allWords.filter((w, i) => allWords.indexOf(w) !== i)
      const uniqueDuplicates = [...new Set(duplicates)]

      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000
      const wordsPerSecond = elapsedSeconds > 0 ? uniqueWords.length / elapsedSeconds : 0

      // Score: based on unique word count (15+ words = 100, scaled linearly)
      const score = Math.min(100, Math.round((uniqueWords.length / 15) * 100))
      const accuracy = allWords.length > 0 ? uniqueWords.length / allWords.length : 0

      setResult({ uniqueWords, duplicates: uniqueDuplicates, wordsPerSecond, score })
      setPhase("result")

      onComplete(score, accuracy, uniqueWords.length, {
        category: category.name,
        unique_words: uniqueWords,
        duplicates: uniqueDuplicates,
        total_words_spoken: allWords.length,
        words_per_second: wordsPerSecond,
        duration_seconds: Math.round(elapsedSeconds),
      })
    }, 500)
  }, [category, onComplete])

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
          <CardTitle className="text-lg font-semibold">Verbal Fluency</CardTitle>
          {phase === "recording" && (
            <Badge variant={timeLeft <= 10 ? "destructive" : "secondary"} className="text-base px-3 py-1 tabular-nums">
              <Clock className="h-3.5 w-3.5 mr-1" />
              {timeLeft}s
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Name as many words in a category as you can in {DURATION} seconds
        </p>
      </CardHeader>
      <CardContent>
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Choose a Category</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;ll have {DURATION} seconds to name as many words as possible
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.name}
                  variant={category.name === cat.name ? "default" : "outline"}
                  onClick={() => setCategory(cat)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
            <Button onClick={startTest} size="lg" className="gap-2 mt-2">
              <Play className="h-4 w-4" /> Start — {category.prompt}
            </Button>
          </div>
        )}

        {phase === "recording" && (
          <div className="space-y-6 py-4">
            {/* Timer progress */}
            <Progress value={(timeLeft / DURATION) * 100} className="h-2" />

            <div className="flex flex-col items-center gap-4">
              {speechFailed ? (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <Keyboard className="h-6 w-6 text-amber-600" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Microphone unavailable — type words and press <kbd className="rounded bg-muted px-1 py-0.5 text-xs font-mono">Space</kbd> after each one
                  </p>
                  <Input
                    autoFocus
                    className="max-w-xs text-center text-lg"
                    placeholder="Type a word..."
                    value={typingInput}
                    onChange={(e) => handleTypingInput(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <VoiceVisualizer isRecording={true} size="md" />
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => { recognitionRef.current?.abort?.(); setSpeechFailed(true) }}>
                    Switch to typing
                  </Button>
                </>
              )}
              <p className="text-lg font-semibold text-primary">{category.prompt}!</p>
            </div>

            {/* Live word count */}
            <div className="flex items-center justify-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold text-foreground">{words.length}</span>
              <span className="text-sm text-muted-foreground">words spoken</span>
            </div>

            {/* Word list */}
            <div className="flex flex-wrap gap-2 justify-center min-h-[60px]">
              {[...new Set(words.map((w) => w.toLowerCase()))].map((word, i) => (
                <Badge key={i} variant="secondary" className="animate-in fade-in zoom-in text-sm">
                  {word}
                </Badge>
              ))}
              {currentTranscript && (
                <Badge variant="outline" className="italic opacity-60 text-sm">
                  {currentTranscript}...
                </Badge>
              )}
            </div>

            <div className="flex justify-center">
              <Button onClick={finishTest} variant="destructive" className="gap-2">
                Stop Early
              </Button>
            </div>
          </div>
        )}

        {phase === "result" && result && (
          <div className="space-y-6 py-4">
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

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{result.uniqueWords.length}</p>
                <p className="text-xs text-muted-foreground">Unique Words</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{result.duplicates.length}</p>
                <p className="text-xs text-muted-foreground">Duplicates</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{result.wordsPerSecond.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Words/sec</p>
              </div>
            </div>

            <Progress value={result.score} className="h-2" />

            <div className="flex flex-wrap gap-2 justify-center">
              {result.uniqueWords.map((word, i) => (
                <Badge key={i} variant="secondary">{word}</Badge>
              ))}
            </div>
            {result.duplicates.length > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Duplicates: {result.duplicates.join(", ")}
              </p>
            )}

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
