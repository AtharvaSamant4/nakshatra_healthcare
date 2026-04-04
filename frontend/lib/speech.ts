/**
 * Speech API utilities — wraps browser-native Web Speech API
 * for speech-to-text (SpeechRecognition) and text-to-speech (SpeechSynthesis).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

// ─── Browser compatibility ──────────────────────────────────────────────────

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  )
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === "undefined") return false
  return !!window.speechSynthesis
}

export function isSpeechSupported(): boolean {
  return isSpeechRecognitionSupported() && isSpeechSynthesisSupported()
}

// ─── SpeechRecognition wrapper ──────────────────────────────────────────────

export interface SpeechRecognitionResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

export interface SpeechRecognitionOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (result: SpeechRecognitionResult) => void
  onEnd?: () => void
  onError?: (error: string) => void
  onSpeechStart?: () => void
}

export function createSpeechRecognition(options: SpeechRecognitionOptions = {}) {
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition

  if (!SpeechRecognitionClass) {
    throw new Error("SpeechRecognition is not supported in this browser")
  }

  const recognition = new SpeechRecognitionClass()
  recognition.lang = options.lang || "en-US"
  recognition.continuous = options.continuous ?? false
  recognition.interimResults = options.interimResults ?? true
  recognition.maxAlternatives = 1

  recognition.onresult = (event: any) => {
    const result = event.results[event.results.length - 1]
    options.onResult?.({
      transcript: result[0].transcript,
      confidence: result[0].confidence,
      isFinal: result.isFinal,
    })
  }

  recognition.onend = () => {
    options.onEnd?.()
  }

  recognition.onerror = (event: any) => {
    options.onError?.(event.error)
  }

  recognition.onspeechstart = () => {
    options.onSpeechStart?.()
  }

  return recognition
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}) {
  const recognitionRef = useRef<any>(null)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)

  const isSupported = useMemo(() => isSpeechRecognitionSupported(), [])

  const start = useCallback(() => {
    if (!isSupported || typeof window === "undefined") return

    setError(null)
    if (!recognitionRef.current) {
      recognitionRef.current = createSpeechRecognition({
        ...options,
        onSpeechStart: () => {
          options.onSpeechStart?.()
        },
        onResult: (result) => {
          if (result.isFinal) {
            setTranscript((prev) => `${prev} ${result.transcript}`.trim())
            setInterimTranscript("")
          } else {
            setInterimTranscript(result.transcript)
          }
          options.onResult?.(result)
        },
        onEnd: () => {
          setIsListening(false)
          options.onEnd?.()
        },
        onError: (err) => {
          setError(err)
          options.onError?.(err)
        },
      })
    }

    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch {
      // Ignore repeated start() calls while already listening.
    }
  }, [isSupported, options])

  const stop = useCallback(() => {
    recognitionRef.current?.stop?.()
    setIsListening(false)
  }, [])

  const abort = useCallback(() => {
    recognitionRef.current?.abort?.()
    setIsListening(false)
  }, [])

  const reset = useCallback(() => {
    setTranscript("")
    setInterimTranscript("")
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.()
    }
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    abort,
    reset,
  }
}

// ─── SpeechSynthesis wrapper ────────────────────────────────────────────────

export interface SpeakOptions {
  text: string
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
  onEnd?: () => void
}

export function speak(options: SpeakOptions): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(options.text)
  utterance.lang = options.lang || "en-US"
  utterance.rate = options.rate ?? 0.9
  utterance.pitch = options.pitch ?? 1
  utterance.volume = options.volume ?? 1

  if (options.onEnd) {
    utterance.onend = options.onEnd
  }

  window.speechSynthesis.cancel() // Cancel any ongoing speech
  window.speechSynthesis.speak(utterance)

  return utterance
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const isSupported = useMemo(() => isSpeechSynthesisSupported(), [])

  const speakText = useCallback((options: SpeakOptions) => {
    if (!isSupported) return null

    const utterance = speak({
      ...options,
      onEnd: () => {
        setIsSpeaking(false)
        options.onEnd?.()
      },
    })

    setIsSpeaking(true)
    return utterance
  }, [isSupported])

  const stop = useCallback(() => {
    stopSpeaking()
    setIsSpeaking(false)
  }, [])

  useEffect(() => {
    return () => {
      stopSpeaking()
    }
  }, [])

  return {
    isSupported,
    isSpeaking,
    speak: speakText,
    stop,
  }
}

// ─── Text cleaning utilities ────────────────────────────────────────────────

const FILLER_WORDS = new Set([
  "um", "uh", "uhh", "umm", "hmm", "hm", "er", "err",
  "ah", "ahh", "oh", "like", "you know", "so", "well",
  "basically", "actually", "literally",
])

export function cleanTranscript(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((word) => !FILLER_WORDS.has(word))
    .join(" ")
    .replace(/[^\w\s'-]/g, "") // Remove punctuation except apostrophes and hyphens
    .replace(/\s+/g, " ")
    .trim()
}

export function tokenize(text: string): string[] {
  return cleanTranscript(text)
    .split(/\s+/)
    .filter((w) => w.length > 0)
}

export function compareWords(expected: string[], actual: string[]): {
  correct: string[]
  missed: string[]
  extra: string[]
  orderScore: number
} {
  const expectedLower = expected.map((w) => w.toLowerCase())
  const actualLower = actual.map((w) => w.toLowerCase())

  const correct = actualLower.filter((w) => expectedLower.includes(w))
  const missed = expectedLower.filter((w) => !actualLower.includes(w))
  const extra = actualLower.filter((w) => !expectedLower.includes(w))

  // Order score: how many items are in the correct relative order
  let orderCorrect = 0
  let lastIndex = -1
  for (const word of actualLower) {
    const idx = expectedLower.indexOf(word)
    if (idx > lastIndex) {
      orderCorrect++
      lastIndex = idx
    }
  }
  const orderScore = expectedLower.length > 0 ? orderCorrect / expectedLower.length : 0

  return { correct, missed, extra, orderScore }
}

/**
 * Simple word similarity for sentence repetition (Jaccard-like)
 */
export function sentenceSimilarity(expected: string, actual: string): number {
  const expTokens = new Set(tokenize(expected))
  const actTokens = new Set(tokenize(actual))

  if (expTokens.size === 0 && actTokens.size === 0) return 1
  if (expTokens.size === 0 || actTokens.size === 0) return 0

  let intersection = 0
  for (const word of expTokens) {
    if (actTokens.has(word)) intersection++
  }

  const union = new Set([...expTokens, ...actTokens]).size
  return intersection / union
}
