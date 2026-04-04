"use client"

import { useState, useEffect, useCallback } from "react"
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
import type { MovementState } from "@/hooks/use-shoulder-flexion-counter"

export default function ExercisePage() {
  const { selectedUserId } = useUser()

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("")
  const [isActive, setIsActive] = useState(false)
  const [repCount, setRepCount] = useState(0)
  const [formQuality, setFormQuality] = useState<"good" | "bad" | "neutral">("neutral")
  const [sessionComplete, setSessionComplete] = useState(false)
  const [duration, setDuration] = useState(0)
  const [startedAt, setStartedAt] = useState<string>("")
  const [sessionAccuracy, setSessionAccuracy] = useState(0)
  const [feedbackId, setFeedbackId] = useState<string | undefined>(undefined)
  const [currentState, setCurrentState] = useState<MovementState>("DOWN")
  const [currentAngle, setCurrentAngle] = useState(0)
  const [activeSide, setActiveSide] = useState<"left" | "right">("right")
  const [calibrated, setCalibrated] = useState(false)

  // Load exercises from API
  useEffect(() => {
    exercisesApi.list()
      .then((data) => {
        setExercises(data)
        if (data.length > 0) setSelectedExerciseId(data[0].id)
      })
      .catch(console.error)
  }, [])

  // Track session duration while active
  useEffect(() => {
    if (!isActive) return

    const durationInterval = setInterval(() => {
      setDuration((prev) => prev + 1)
    }, 1000)

    return () => {
      clearInterval(durationInterval)
    }
  }, [isActive])

  const handleMetricsChange = useCallback(
    (metrics: {
      repCount: number
      currentAngle: number
      currentState: MovementState
      formQuality: "good" | "bad" | "neutral"
      activeSide: "left" | "right"
      calibrated: boolean
      upThreshold: number
      downThreshold: number
    }) => {
      if (!isActive) return
      setRepCount(metrics.repCount)
      setCurrentAngle(metrics.currentAngle)
      setCurrentState(metrics.currentState)
      setFormQuality(metrics.formQuality)
      setActiveSide(metrics.activeSide)
      setCalibrated(metrics.calibrated)
    },
    [isActive]
  )

  const handleStart = useCallback(() => {
    setStartedAt(new Date().toISOString())
    setIsActive(true)
    setFormQuality("neutral")
  }, [])

  const handleStop = useCallback(async () => {
    setIsActive(false)

    // Derive a form_score from the simulated good/bad form (0.0–1.0)
    // Use a fixed 0.85 as a reasonable default for demo purposes
    const form_score = 0.85
    setSessionAccuracy(Math.round(form_score * 100))

    if (selectedUserId && selectedExerciseId && startedAt) {
      try {
        const completedAt = new Date().toISOString()
        const result = await sessionsApi.create({
          user_id: selectedUserId,
          exercise_id: selectedExerciseId,
          reps_completed: repCount,
          form_score,
          duration_seconds: duration,
          started_at: startedAt,
          completed_at: completedAt,
        })
        setFeedbackId(result.feedback_id)
      } catch (err) {
        console.error("Failed to save session:", err)
      }
    }

    setSessionComplete(true)
  }, [selectedUserId, selectedExerciseId, repCount, duration, startedAt])

  const handleReset = useCallback(() => {
    setRepCount(0)
    setDuration(0)
    setFormQuality("neutral")
    setSessionComplete(false)
    setStartedAt("")
    setFeedbackId(undefined)
    setCurrentState("DOWN")
    setCurrentAngle(0)
    setActiveSide("right")
    setCalibrated(false)
  }, [])

  const handleNewSession = useCallback(() => {
    handleReset()
    setIsActive(false)
  }, [handleReset])

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId)

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
        {/* Page Header */}
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
            <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
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

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Webcam Feed */}
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

            {/* Live Stats Overlay */}
            {isActive && (
              <div className="mt-4 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 shadow-sm">
                  <span className="text-sm text-muted-foreground">Duration:</span>
                  <span className="font-mono text-lg font-semibold text-foreground">
                    {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 shadow-sm">
                  <span className="text-sm text-muted-foreground">Angle:</span>
                  <span className="font-mono text-lg font-semibold text-foreground">
                    {Math.round(currentAngle)}deg
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 shadow-sm">
                  <span className="text-sm text-muted-foreground">State:</span>
                  <span className="font-mono text-lg font-semibold text-foreground">{currentState}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 shadow-sm">
                  <span className="text-sm text-muted-foreground">Side:</span>
                  <span className="font-mono text-lg font-semibold text-foreground capitalize">{activeSide}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-accent"></span>
                  </span>
                  <span className="text-sm font-medium text-accent">
                    {calibrated ? "Recording" : "Calibrating"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div>
            <ExerciseControls
              isActive={isActive}
              repCount={repCount}
              formQuality={formQuality}
              onStart={handleStart}
              onStop={handleStop}
              onReset={handleReset}
            />

            {/* Exercise Info */}
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
