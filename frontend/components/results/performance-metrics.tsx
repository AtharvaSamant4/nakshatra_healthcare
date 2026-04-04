"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { type ProgressResponse } from "@/lib/api"
import { Target, Dumbbell, Brain, Zap } from "lucide-react"

interface PerformanceMetricsProps {
  progress: ProgressResponse | null
  loading?: boolean
}

export function PerformanceMetrics({ progress, loading }: PerformanceMetricsProps) {
  const avgFormPct = progress?.summary.avg_form_score != null
    ? Math.round(progress.summary.avg_form_score * 100)
    : null

  const memoryGames = progress?.summary.total_game_sessions ?? 0
  const totalSessions = progress?.summary.total_exercise_sessions ?? 0
  const streakDays = progress?.summary.current_streak_days ?? 0

  // Derive simple 0–100 values for bar display
  const streakScore = Math.min(100, streakDays * 10) // 10 days = 100%
  const sessionScore = Math.min(100, totalSessions * 2) // 50 sessions = 100%

  const metrics = [
    {
      label: "Exercise Accuracy",
      value: avgFormPct ?? 0,
      icon: Target,
    },
    {
      label: "Session Progress",
      value: sessionScore,
      icon: Dumbbell,
    },
    {
      label: "Game Sessions",
      value: Math.min(100, memoryGames * 5), // 20 games = 100%
      icon: Brain,
    },
    {
      label: "Streak Score",
      value: streakScore,
      icon: Zap,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          metrics.map((metric) => (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <metric.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{metric.label}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {metric.value}%
                </span>
              </div>
              <Progress value={metric.value} className="h-2" />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
