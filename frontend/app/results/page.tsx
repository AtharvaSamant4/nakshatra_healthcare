"use client"

import { useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { WeeklyChart } from "@/components/results/weekly-chart"
import { PerformanceMetrics } from "@/components/results/performance-metrics"
import { AIFeedback } from "@/components/results/ai-feedback"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  gameSessionsApi,
  progressApi,
  sessionsApi,
  type GameSessionListItem,
  type ProgressResponse,
  type SessionListItem,
} from "@/lib/api"
import { useApp } from "@/lib/app-context"
import {
  Calendar,
  Dumbbell,
  Flame,
  Target,
  TrendingUp,
  Clock,
  Brain,
  Zap,
  Layers,
  Route,
} from "lucide-react"

function formatDuration(seconds?: number): string {
  if (seconds == null) return "N/A"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export default function ResultsPage() {
  const { selectedUserId } = useApp()
  const userLoading = false
  const [progress, setProgress] = useState<ProgressResponse | null>(null)
  const [lastSession, setLastSession] = useState<SessionListItem | null>(null)
  const [memorySessions, setMemorySessions] = useState<GameSessionListItem[]>([])
  const [reactionSessions, setReactionSessions] = useState<GameSessionListItem[]>([])
  const [stroopSessions, setStroopSessions] = useState<GameSessionListItem[]>([])
  const [trailSessions, setTrailSessions] = useState<GameSessionListItem[]>([])
  const [memoryTotal, setMemoryTotal] = useState(0)
  const [reactionTotal, setReactionTotal] = useState(0)
  const [stroopTotal, setStroopTotal] = useState(0)
  const [trailTotal, setTrailTotal] = useState(0)
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (!selectedUserId) return
    setDataLoading(true)

    Promise.all([
      progressApi.get(selectedUserId),
      sessionsApi.list(selectedUserId, 1, 0),
      gameSessionsApi.list(selectedUserId, "memory", 100),
      gameSessionsApi.list(selectedUserId, "reaction", 100),
      gameSessionsApi.list(selectedUserId, "stroop", 100),
      gameSessionsApi.list(selectedUserId, "trail_making" as never, 100),
    ])
      .then(([progressData, sessionData, memoryData, reactionData, stroopData, trailData]) => {
        setProgress(progressData)
        setLastSession(sessionData.sessions[0] ?? null)
        setMemorySessions(memoryData.sessions)
        setReactionSessions(reactionData.sessions)
        setStroopSessions(stroopData.sessions)
        setTrailSessions(trailData.sessions)
        setMemoryTotal(memoryData.total)
        setReactionTotal(reactionData.total)
        setStroopTotal(stroopData.total)
        setTrailTotal(trailData.total)
      })
      .catch(console.error)
      .finally(() => setDataLoading(false))
  }, [selectedUserId])

  const isLoading = userLoading || dataLoading

  const overallProgress = progress?.summary.avg_form_score != null
    ? Math.round(progress.summary.avg_form_score * 100)
    : null

  const bestMemoryDuration = useMemo(() => {
    const durations = memorySessions
      .map((session) => session.duration_seconds)
      .filter((value): value is number => value != null)
    if (durations.length === 0) return null
    return Math.min(...durations)
  }, [memorySessions])

  const memoryAvgAccuracy = useMemo(() => {
    const values = memorySessions
      .map((session) => session.accuracy)
      .filter((value): value is number => value != null)
    return average(values)
  }, [memorySessions])

  const bestReactionScore = useMemo(() => {
    if (reactionSessions.length === 0) return null
    return Math.max(...reactionSessions.map((session) => session.score))
  }, [reactionSessions])

  const reactionAvgAccuracy = useMemo(() => {
    const values = reactionSessions
      .map((session) => session.accuracy)
      .filter((value): value is number => value != null)
    return average(values)
  }, [reactionSessions])

  const stroopAvgAccuracy = useMemo(() => {
    const values = stroopSessions.map((s) => s.accuracy).filter((v): v is number => v != null)
    return average(values)
  }, [stroopSessions])

  const stroopBestScore = useMemo(() => {
    if (stroopSessions.length === 0) return null
    return Math.max(...stroopSessions.map((s) => s.score))
  }, [stroopSessions])

  const trailAvgAccuracy = useMemo(() => {
    const values = trailSessions.map((s) => s.accuracy).filter((v): v is number => v != null)
    return average(values)
  }, [trailSessions])

  const trailBestTime = useMemo(() => {
    const durations = trailSessions.map((s) => s.duration_seconds).filter((v): v is number => v != null)
    if (durations.length === 0) return null
    return Math.min(...durations)
  }, [trailSessions])

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              Your Results
            </h1>
            <p className="mt-1 text-muted-foreground">
              Track your rehabilitation progress over time
            </p>
          </div>
          <Badge
            variant="secondary"
            className="w-fit bg-accent/10 text-accent px-4 py-2"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Overall Progress: {isLoading ? "--" : overallProgress != null ? `${overallProgress}%` : "N/A"}
          </Badge>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoading ? "--" : progress?.summary.total_exercise_sessions ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Reps</p>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoading ? "--" : (progress?.summary.total_reps ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <Flame className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Day Streak</p>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoading ? "--" : progress?.summary.current_streak_days ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <Target className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoading
                      ? "--"
                      : progress?.summary.avg_form_score != null
                      ? `${Math.round(progress.summary.avg_form_score * 100)}%`
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Last Session Summary */}
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !lastSession ? (
              <p className="text-sm text-muted-foreground">No exercise sessions yet.</p>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <Clock className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Session</p>
                    <p className="text-lg font-semibold text-foreground">
                      {lastSession.exercise_name ?? "Exercise Session"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(lastSession.completed_at).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{lastSession.reps_completed}</p>
                    <p className="text-xs text-muted-foreground">Reps</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {formatDuration(lastSession.duration_seconds)}
                    </p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {lastSession.form_score != null ? `${Math.round(lastSession.form_score * 100)}%` : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">Accuracy</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts and Metrics */}
        <div className="grid gap-6 lg:grid-cols-2">
          <WeeklyChart data={progress?.exercise_progress ?? []} loading={isLoading} />
          <PerformanceMetrics progress={progress} loading={isLoading} />
        </div>

        {/* Game Stats */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Memory */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Brain className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Memory Game Stats</p>
                  <div className="mt-2 flex gap-4">
                    <div>
                      <p className="text-lg font-bold text-foreground">{isLoading ? "--" : memoryTotal}</p>
                      <p className="text-xs text-muted-foreground">Games</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {isLoading ? "--" : bestMemoryDuration != null ? formatDuration(bestMemoryDuration) : "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">Best Time</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {isLoading ? "--" : memoryAvgAccuracy != null ? `${Math.round(memoryAvgAccuracy * 100)}%` : "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Accuracy</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reaction */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10">
                  <Zap className="h-7 w-7 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Reaction Game Stats</p>
                  <div className="mt-2 flex gap-4">
                    <div>
                      <p className="text-lg font-bold text-foreground">{isLoading ? "--" : reactionTotal}</p>
                      <p className="text-xs text-muted-foreground">Games</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {isLoading ? "--" : bestReactionScore != null ? bestReactionScore : "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">Best Score</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {isLoading ? "--" : reactionAvgAccuracy != null ? `${Math.round(reactionAvgAccuracy * 100)}%` : "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Accuracy</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stroop */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500/10">
                  <Layers className="h-7 w-7 text-violet-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Stroop Test Stats</p>
                  <div className="mt-2 flex gap-4">
                    <div>
                      <p className="text-lg font-bold text-foreground">{isLoading ? "--" : stroopTotal}</p>
                      <p className="text-xs text-muted-foreground">Tests</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {isLoading ? "--" : stroopBestScore != null ? `${stroopBestScore}%` : "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">Best Score</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {isLoading ? "--" : stroopAvgAccuracy != null ? `${Math.round(stroopAvgAccuracy * 100)}%` : "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Accuracy</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trail Making */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Route className="h-7 w-7 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Trail Making Stats</p>
                  <div className="mt-2 flex gap-4">
                    <div>
                      <p className="text-lg font-bold text-foreground">{isLoading ? "--" : trailTotal}</p>
                      <p className="text-xs text-muted-foreground">Tests</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {isLoading ? "--" : trailBestTime != null ? formatDuration(trailBestTime) : "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">Best Time</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {isLoading ? "--" : trailAvgAccuracy != null ? `${Math.round(trailAvgAccuracy * 100)}%` : "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Accuracy</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Feedback */}
        <AIFeedback feedback={progress?.recent_feedback ?? []} loading={isLoading} />
      </div>
    </AppLayout>
  )
}
