"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { WebcamFeed } from "@/components/exercise/webcam-feed"
import { ExerciseControls } from "@/components/exercise/exercise-controls"
import { SessionSummary } from "@/components/exercise/session-summary"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { exercisesApi, sessionsApi, prescriptionsApi, type Exercise, type Prescription } from "@/lib/api"
import { useApp } from "@/lib/app-context"
import type { MovementState } from "@/hooks/use-shoulder-flexion-counter"

const DEMO_DURATION_SECONDS = 10

export default function PatientExercisePage() {
  const { selectedUserId, role } = useApp()
  const router = useRouter()

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("")
  const [activePrescriptionId, setActivePrescriptionId] = useState<string | undefined>(undefined)

  // Session lifecycle
  const [isActive, setIsActive] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [demoSecondsRemaining, setDemoSecondsRemaining] = useState(DEMO_DURATION_SECONDS)
  const [sessionComplete, setSessionComplete] = useState(false)

  // Live metrics — populated by onMetricsChange from WebcamFeed
  const [repCount, setRepCount] = useState(0)
  const [formQuality, setFormQuality] = useState<"good" | "bad" | "neutral">("neutral")
  const [currentAngle, setCurrentAngle] = useState(0)
  const [currentState, setCurrentState] = useState<MovementState>("DOWN")
  const [activeSide, setActiveSide] = useState<"left" | "right">("left")

  // Session save state
  const [duration, setDuration] = useState(0)
  const [startedAt, setStartedAt] = useState<string>("")
  const [sessionAccuracy, setSessionAccuracy] = useState(0)
  const [feedbackId, setFeedbackId] = useState<string | undefined>(undefined)

  const progressiveScoreSumRef = useRef(0)
  const progressiveScoreCountRef = useRef(0)
  const postureScoreSumRef = useRef(0)
  const postureScoreCountRef = useRef(0)
  const angleMinRef = useRef<number | null>(null)
  const angleMaxRef = useRef<number | null>(null)
  const angleSumRef = useRef(0)
  const angleCountRef = useRef(0)

  useEffect(() => {
    if (role !== "patient") {
      router.replace("/login")
    }
  }, [role, router])

  // Fetch exercises and prescriptions in parallel
  useEffect(() => {
    if (!selectedUserId) return

    Promise.all([
      exercisesApi.list(),
      prescriptionsApi.list(selectedUserId).catch(() => [] as Prescription[]),
    ]).then(([allExercises, rx]) => {
      const activeRx = rx.filter((p) => p.status === "active")
      setPrescriptions(activeRx)

      // Always show the full exercise catalog — prescriptions are shown as a
      // contextual banner when the matching exercise is selected, not as a filter.
      setExercises(allExercises)
      if (allExercises.length > 0) setSelectedExerciseId(allExercises[0].id)
    }).catch(console.error)
  }, [selectedUserId])

  // When exercise selection changes, find matching prescription
  useEffect(() => {
    const rx = prescriptions.find((p) => p.exercise_id === selectedExerciseId)
    setActivePrescriptionId(rx?.id)
  }, [selectedExerciseId, prescriptions])

  // Demo countdown: tick down every second, then start real tracking
  useEffect(() => {
    if (!isPreparing) return
    if (demoSecondsRemaining <= 0) {
      setIsPreparing(false)
      setIsActive(true)
      return
    }
    const timer = setTimeout(() => {
      setDemoSecondsRemaining((prev) => prev - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [isPreparing, demoSecondsRemaining])

  // Duration timer — only while tracking is active
  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => setDuration((prev) => prev + 1), 1000)
    return () => clearInterval(interval)
  }, [isActive])

  // Callback wired to WebcamFeed — receives real metrics every frame
  const handleMetricsChange = useCallback((metrics: {
    repCount: number
    currentAngle: number
    currentState: MovementState
    formQuality: "good" | "bad" | "neutral"
    activeSide: "left" | "right"
    calibrated: boolean
    upThreshold: number
    downThreshold: number
    score?: number
    quality?: string
    postureScore?: number
  }) => {
    setRepCount(metrics.repCount)
    setFormQuality(metrics.formQuality)
    setCurrentAngle(Math.round(metrics.currentAngle))
    setCurrentState(metrics.currentState)
    setActiveSide(metrics.activeSide)
    if (metrics.calibrated) {
      const ang = metrics.currentAngle
      if (Number.isFinite(ang)) {
        angleSumRef.current += ang
        angleCountRef.current += 1
        if (angleMinRef.current === null || ang < angleMinRef.current) {
          angleMinRef.current = ang
        }
        if (angleMaxRef.current === null || ang > angleMaxRef.current) {
          angleMaxRef.current = ang
        }
      }
      if (typeof metrics.score === "number") {
        progressiveScoreSumRef.current += metrics.score
        progressiveScoreCountRef.current += 1
      }
      if (typeof metrics.postureScore === "number") {
        postureScoreSumRef.current += metrics.postureScore
        postureScoreCountRef.current += 1
      }
    }
  }, [])

  const handleStart = useCallback(() => {
    progressiveScoreSumRef.current = 0
    progressiveScoreCountRef.current = 0
    postureScoreSumRef.current = 0
    postureScoreCountRef.current = 0
    angleMinRef.current = null
    angleMaxRef.current = null
    angleSumRef.current = 0
    angleCountRef.current = 0
    setStartedAt(new Date().toISOString())
    setIsPreparing(true)
    setDemoSecondsRemaining(DEMO_DURATION_SECONDS)
  }, [])

  const handleSkipDemo = useCallback(() => {
    setIsPreparing(false)
    setIsActive(true)
  }, [])

  const handleStop = useCallback(async () => {
    setIsActive(false)

    const nProg = progressiveScoreCountRef.current
    const avgProg =
      nProg > 0 ? progressiveScoreSumRef.current / nProg : null
    const nPos = postureScoreCountRef.current
    const avgPosture =
      nPos > 0 ? postureScoreSumRef.current / nPos : null

    // Session-level form 0–1: prefer average progressive ROM, then average posture bar.
    // Do NOT use end-of-session formQuality alone (arm at rest → "bad" → 50% every time).
    let form_score: number
    if (avgProg != null) {
      form_score = Math.max(0.06, Math.min(1, avgProg / 100))
    } else if (avgPosture != null) {
      form_score = Math.max(0.06, Math.min(1, avgPosture / 100))
    } else if (repCount > 0) {
      const base =
        formQuality === "good" ? 0.58 : formQuality === "neutral" ? 0.48 : 0.4
      form_score = Math.min(0.92, base + 0.035 * Math.min(repCount, 14))
    } else {
      form_score = 0.35
    }

    const score =
      avgProg != null
        ? Math.round(avgProg)
        : Math.round(form_score * 100)
    let quality = "poor"
    if (score >= 85) quality = "perfect"
    else if (score >= 60) quality = "good"
    else if (score >= 30) quality = "improving"
    console.log("Exercise Score:", score, quality, "form_score", form_score)

    setSessionAccuracy(Math.round(form_score * 100))

    if (selectedUserId && selectedExerciseId && startedAt) {
      const na = angleCountRef.current
      const avg_angle = na > 0 ? angleSumRef.current / na : undefined
      const min_angle =
        angleMinRef.current != null ? angleMinRef.current : undefined
      const max_angle =
        angleMaxRef.current != null ? angleMaxRef.current : undefined

      const payload = {
        user_id: selectedUserId,
        exercise_id: selectedExerciseId,
        reps_completed: repCount,
        form_score,
        duration_seconds: duration,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        score,
        quality,
        ...(avg_angle != null ? { avg_angle } : {}),
        ...(min_angle != null ? { min_angle } : {}),
        ...(max_angle != null ? { max_angle } : {}),
        ...(activePrescriptionId ? { prescription_id: activePrescriptionId } : {}),
      }
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
      let lastErr: unknown
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) await sleep(400 * attempt)
          const result = await sessionsApi.create(payload)
          setFeedbackId(result.feedback_id)
          lastErr = undefined
          break
        } catch (err) {
          lastErr = err
          console.warn(`Session save attempt ${attempt + 1} failed`, err)
        }
      }
      if (lastErr) console.error("Failed to save session after retries:", lastErr)
    }
    setSessionComplete(true)
  }, [selectedUserId, selectedExerciseId, repCount, duration, startedAt, activePrescriptionId, formQuality])

  const handleReset = useCallback(() => {
    progressiveScoreSumRef.current = 0
    progressiveScoreCountRef.current = 0
    postureScoreSumRef.current = 0
    postureScoreCountRef.current = 0
    angleMinRef.current = null
    angleMaxRef.current = null
    angleSumRef.current = 0
    angleCountRef.current = 0
    setRepCount(0)
    setDuration(0)
    setFormQuality("neutral")
    setCurrentAngle(0)
    setCurrentState("DOWN")
    setSessionComplete(false)
    setStartedAt("")
    setFeedbackId(undefined)
  }, [])

  const handleNewSession = useCallback(() => {
    handleReset()
    setIsActive(false)
    setIsPreparing(false)
  }, [handleReset])

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId)
  const matchingPrescription = prescriptions.find((p) => p.exercise_id === selectedExerciseId)

  if (sessionComplete) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
          <SessionSummary
            reps={repCount}
            duration={duration}
            accuracy={sessionAccuracy}
            onNewSession={handleNewSession}
          />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Exercise Session</h1>
            <p className="mt-1 text-muted-foreground">
              {prescriptions.length > 0
                ? "Showing your prescribed exercises"
                : "Follow along with AI-guided exercises"}
            </p>
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={selectedExerciseId}
              onValueChange={setSelectedExerciseId}
              disabled={isActive || isPreparing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select exercise" />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Prescription context banner */}
        {matchingPrescription && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="text-sm text-primary font-medium">Prescribed exercise</div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                {matchingPrescription.target_reps && (
                  <span>Target: {matchingPrescription.target_reps} reps</span>
                )}
                {matchingPrescription.frequency && <span>· {matchingPrescription.frequency}</span>}
                <span>· {matchingPrescription.compliance?.sessions_completed ?? 0} sessions done</span>
              </div>
              <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary text-xs">
                {matchingPrescription.priority} priority
              </Badge>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <WebcamFeed
                  isActive={isActive}
                  showDemo={isPreparing}
                  demoSecondsRemaining={demoSecondsRemaining}
                  demoExerciseName={selectedExercise?.name}
                  demoInstructions={selectedExercise?.instructions}
                  angleConfig={selectedExercise?.angle_config}
                  onMetricsChange={handleMetricsChange}
                  className="aspect-video"
                />
              </CardContent>
            </Card>

            {/* Status bar — shown while demo or tracking */}
            {(isActive || isPreparing) && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <StatusPill label="Duration">
                  {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}
                </StatusPill>
                {isActive && (
                  <>
                    <StatusPill label="Angle">{currentAngle}deg</StatusPill>
                    <StatusPill label="State">{currentState}</StatusPill>
                    <StatusPill label="Side">
                      {activeSide.charAt(0).toUpperCase() + activeSide.slice(1)}
                    </StatusPill>
                  </>
                )}
                <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 shadow-sm">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
                  </span>
                  <span className="text-sm font-medium text-accent">
                    {isPreparing ? "Demo" : "Recording"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <ExerciseControls
              isActive={isActive}
              isPreparing={isPreparing}
              preparationSeconds={demoSecondsRemaining}
              repCount={repCount}
              formQuality={formQuality}
              onStart={handleStart}
              onStop={handleStop}
              onReset={handleReset}
              onSkipDemo={handleSkipDemo}
            />

            {selectedExercise && (
              <Card className="mt-4">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground">{selectedExercise.name}</h3>
                  {selectedExercise.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{selectedExercise.description}</p>
                  )}
                  <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{selectedExercise.body_part}</span>
                    <span>·</span>
                    <span className="capitalize">{selectedExercise.difficulty}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function StatusPill({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 shadow-sm">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="font-mono text-lg font-semibold text-foreground">{children}</span>
    </div>
  )
}
