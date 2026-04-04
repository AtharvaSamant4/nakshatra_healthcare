"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
import { exercisesApi, sessionsApi, type Exercise } from "@/lib/api"
import { useUser } from "@/lib/user-context"
import { type CounterOutput } from "@/hooks/use-shoulder-flexion-counter"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveMetrics {
  repCount:      number
  currentAngle:  number | null
  poseState:     string
  activeSide:    string
  calibrating:   boolean
  upThreshold:   number
  downThreshold: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExercisePage() {
  const { selectedUserId } = useUser()

  // Exercise list
  const [exercises, setExercises]               = useState<Exercise[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("")

  // Session state
  const [isActive, setIsActive]           = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [sessionReps, setSessionReps]     = useState(0)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [sessionAccuracy, setSessionAccuracy] = useState(0)
  const [startedAt, setStartedAt]         = useState<string>("")

  // Live display metrics — updated from pose frames but only when values change.
  const [live, setLive] = useState<LiveMetrics>({
    repCount:      0,
    currentAngle:  null,
    poseState:     "DOWN",
    activeSide:    "right",
    calibrating:   false,
    upThreshold:   75,
    downThreshold: 35,
  })
  const [duration, setDuration] = useState(0)

  // Derive form quality from pose state for ExerciseControls badge.
  // "good"    → arm is UP (correct position reached)
  // "bad"     → angle is below downThreshold while session has reps (too low)
  // "neutral" → between thresholds or not started
  const [formQuality, setFormQuality] = useState<"good" | "bad" | "neutral">("neutral")

  // Refs for values needed inside async stop handler — avoids stale closures.
  const repCountRef      = useRef(0)
  const durationRef      = useRef(0)
  const formScoresRef    = useRef<number[]>([])
  // Last output ref — used to compute form quality without extra state.
  const lastOutputRef    = useRef<CounterOutput | null>(null)

  // ─── Load exercises ────────────────────────────────────────────────────────
  useEffect(() => {
    exercisesApi.list()
      .then((data) => {
        setExercises(data)
        if (data.length > 0) setSelectedExerciseId(data[0].id)
      })
      .catch(console.error)
  }, [])

  // ─── Duration timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return
    const id = setInterval(() => {
      durationRef.current += 1
      setDuration(durationRef.current)
    }, 1000)
    return () => clearInterval(id)
  }, [isActive])

  // ─── Metrics handler ───────────────────────────────────────────────────────
  // Called on every pose frame (~30 fps). We batch all React state into a
  // single setLive call and only fire it when something actually changed to
  // minimise re-renders.
  const handleMetricsChange = useCallback((output: CounterOutput) => {
    lastOutputRef.current = output

    // Keep ref in sync for the stop handler.
    repCountRef.current = output.repCount

    // Accumulate angle samples for form score (skip calibration phase).
    if (output.currentAngle !== null && !output.calibrating) {
      formScoresRef.current.push(output.currentAngle)
    }

    // Derive form quality
    let fq: "good" | "bad" | "neutral" = "neutral"
    if (!output.calibrating && output.currentAngle !== null) {
      if (output.currentState === "UP") {
        fq = "good"
      } else if (
        output.currentState === "DOWN" &&
        output.repCount > 0 &&
        output.currentAngle < output.downThreshold - 5
      ) {
        // Arm returned too far below the down threshold — signal to adjust.
        fq = "bad"
      }
    }

    // Batch update — only trigger if something visible changed.
    setLive((prev) => {
      const next: LiveMetrics = {
        repCount:      output.repCount,
        currentAngle:  output.currentAngle,
        poseState:     output.currentState,
        activeSide:    output.activeSide,
        calibrating:   output.calibrating,
        upThreshold:   output.upThreshold,
        downThreshold: output.downThreshold,
      }
      // Shallow equal check — avoids re-render when nothing changed.
      if (
        prev.repCount      === next.repCount      &&
        prev.currentAngle  === next.currentAngle  &&
        prev.poseState     === next.poseState      &&
        prev.activeSide    === next.activeSide     &&
        prev.calibrating   === next.calibrating    &&
        prev.upThreshold   === next.upThreshold    &&
        prev.downThreshold === next.downThreshold
      ) return prev
      return next
    })

    setFormQuality(fq)
  }, [])

  // ─── Controls ─────────────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    // Reset all session tracking.
    repCountRef.current   = 0
    durationRef.current   = 0
    formScoresRef.current = []
    lastOutputRef.current = null
    setLive({
      repCount: 0, currentAngle: null, poseState: "DOWN",
      activeSide: "right", calibrating: true, upThreshold: 75, downThreshold: 35,
    })
    setDuration(0)
    setFormQuality("neutral")
    setStartedAt(new Date().toISOString())
    setIsActive(true)
  }, [])

  const handleStop = useCallback(async () => {
    setIsActive(false)

    const finalReps     = repCountRef.current
    const finalDuration = durationRef.current

    // Form score: proportion of post-calibration frames where angle > downThreshold.
    // This rewards time spent in the active range, not just at peak.
    const angles    = formScoresRef.current
    const threshold = lastOutputRef.current?.downThreshold ?? 35
    const formScore = angles.length > 0
      ? angles.filter(a => a > threshold).length / angles.length
      : 0.5

    setSessionReps(finalReps)
    setSessionDuration(finalDuration)
    setSessionAccuracy(Math.round(formScore * 100))

    if (selectedUserId && selectedExerciseId && startedAt) {
      try {
        await sessionsApi.create({
          user_id:          selectedUserId,
          exercise_id:      selectedExerciseId,
          reps_completed:   finalReps,
          form_score:       formScore,
          duration_seconds: finalDuration,
          started_at:       startedAt,
          completed_at:     new Date().toISOString(),
        })
      } catch (err) {
        console.error("Failed to save session:", err)
        // Non-fatal — session summary still shows.
      }
    }

    setSessionComplete(true)
  }, [selectedUserId, selectedExerciseId, startedAt])

  const handleReset = useCallback(() => {
    repCountRef.current   = 0
    durationRef.current   = 0
    formScoresRef.current = []
    lastOutputRef.current = null
    setLive({
      repCount: 0, currentAngle: null, poseState: "DOWN",
      activeSide: "right", calibrating: false, upThreshold: 75, downThreshold: 35,
    })
    setDuration(0)
    setFormQuality("neutral")
    setSessionComplete(false)
    setSessionReps(0)
    setSessionDuration(0)
    setSessionAccuracy(0)
    setStartedAt("")
  }, [])

  const handleNewSession = useCallback(() => {
    handleReset()
    setIsActive(false)
  }, [handleReset])

  const selectedExercise = exercises.find(e => e.id === selectedExerciseId)

  // ─── Session complete screen ───────────────────────────────────────────────
  if (sessionComplete) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
          <SessionSummary
            reps={sessionReps}
            duration={sessionDuration}
            accuracy={sessionAccuracy}
            onNewSession={handleNewSession}
          />
        </div>
      </AppLayout>
    )
  }

  // ─── Active session screen ─────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              Exercise Session
            </h1>
            <p className="mt-1 text-muted-foreground">
              Follow along with AI-guided exercises
            </p>
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={selectedExerciseId}
              onValueChange={setSelectedExerciseId}
              disabled={isActive}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select exercise" />
              </SelectTrigger>
              <SelectContent>
                {exercises.map(ex => (
                  <SelectItem key={ex.id} value={ex.id}>
                    {ex.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Webcam — spans 2 cols */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <WebcamFeed
                  isActive={isActive}
                  className="aspect-video"
                  onMetricsChange={handleMetricsChange}
                />
              </CardContent>
            </Card>

            {/* Live debug strip */}
            {isActive && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">

                {/* Duration */}
                <Chip label="Duration">
                  <span className="font-mono">
                    {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}
                  </span>
                </Chip>

                {/* Angle */}
                {live.currentAngle !== null && (
                  <Chip label="Angle">
                    <span className="font-mono">{Math.round(live.currentAngle)}°</span>
                  </Chip>
                )}

                {/* Thresholds */}
                {!live.calibrating && (
                  <Chip label="Thresholds">
                    <span className="font-mono text-xs">
                      ↑{Math.round(live.upThreshold)}° ↓{Math.round(live.downThreshold)}°
                    </span>
                  </Chip>
                )}

                {/* State */}
                <Chip label="State">
                  <span className={live.poseState === "UP" ? "text-accent font-semibold" : "font-semibold"}>
                    {live.poseState}
                  </span>
                </Chip>

                {/* Side */}
                <Chip label="Side">
                  <span className="capitalize">{live.activeSide}</span>
                </Chip>

                {/* Status indicator */}
                {live.calibrating ? (
                  <StatusPill color="yellow" label="Calibrating" />
                ) : (
                  <StatusPill color="green" label="Recording" />
                )}

              </div>
            )}
          </div>

          {/* Controls */}
          <div>
            <ExerciseControls
              isActive={isActive}
              repCount={live.repCount}
              formQuality={formQuality}
              onStart={handleStart}
              onStop={handleStop}
              onReset={handleReset}
            />

            {selectedExercise && (
              <Card className="mt-4">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground">{selectedExercise.name}</h3>
                  {selectedExercise.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedExercise.description}
                    </p>
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

// ─── Small inline UI helpers (keep co-located, no separate file needed) ───────

function Chip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-card px-3 py-2 shadow-sm text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
    </div>
  )
}

function StatusPill({ color, label }: { color: "yellow" | "green"; label: string }) {
  const ring = color === "yellow" ? "bg-yellow-400" : "bg-accent"
  const text = color === "yellow" ? "text-yellow-500" : "text-accent"
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${ring} opacity-75`} />
        <span className={`relative inline-flex h-3 w-3 rounded-full ${ring}`} />
      </span>
      <span className={`text-sm font-medium ${text}`}>{label}</span>
    </div>
  )
}
