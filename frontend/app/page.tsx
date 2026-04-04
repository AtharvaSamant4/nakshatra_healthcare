"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { StatsCard } from "@/components/dashboard/stats-card"
import { ProgressChart } from "@/components/dashboard/progress-chart"
import { RecentSessions } from "@/components/dashboard/recent-sessions"
import { AIInsights } from "@/components/dashboard/ai-insights"
import { useUser } from "@/lib/user-context"
import { progressApi, sessionsApi, type ProgressResponse, type SessionListItem } from "@/lib/api"
import { Calendar, Dumbbell, Flame, Target } from "lucide-react"

export default function DashboardPage() {
  const { selectedUserId, selectedUser, loading: userLoading } = useUser()
  const [progress, setProgress] = useState<ProgressResponse | null>(null)
  const [recentSessions, setRecentSessions] = useState<SessionListItem[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (!selectedUserId) return
    setDataLoading(true)
    Promise.all([
      progressApi.get(selectedUserId),
      sessionsApi.list(selectedUserId, 5),
    ])
      .then(([prog, sessions]) => {
        setProgress(prog)
        setRecentSessions(sessions.sessions)
      })
      .catch(console.error)
      .finally(() => setDataLoading(false))
  }, [selectedUserId])

  const isLoading = userLoading || dataLoading

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Welcome back, {selectedUser?.name ?? "…"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Track your progress and continue your rehabilitation journey
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Sessions"
            value={isLoading ? "—" : String(progress?.summary.total_exercise_sessions ?? 0)}
            description="Exercise sessions"
            icon={Calendar}
          />
          <StatsCard
            title="Total Reps"
            value={isLoading ? "—" : (progress?.summary.total_reps ?? 0).toLocaleString()}
            description="All time"
            icon={Dumbbell}
          />
          <StatsCard
            title="Day Streak"
            value={isLoading ? "—" : String(progress?.summary.current_streak_days ?? 0)}
            description="Keep it going!"
            icon={Flame}
          />
          <StatsCard
            title="Avg Form Score"
            value={
              isLoading
                ? "—"
                : progress?.summary.avg_form_score != null
                ? `${Math.round(progress.summary.avg_form_score * 100)}%`
                : "N/A"
            }
            description="Last sessions"
            icon={Target}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProgressChart
              data={progress?.exercise_progress ?? []}
              loading={isLoading}
            />
          </div>
          <div>
            <AIInsights
              feedback={progress?.recent_feedback ?? []}
              loading={isLoading}
            />
          </div>
        </div>

        <RecentSessions sessions={recentSessions} loading={isLoading} />
      </div>
    </AppLayout>
  )
}
