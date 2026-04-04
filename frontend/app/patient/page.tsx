"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { StatsCard } from "@/components/dashboard/stats-card"
import { ProgressChart } from "@/components/dashboard/progress-chart"
import { RecentSessions } from "@/components/dashboard/recent-sessions"
import { AIInsights } from "@/components/dashboard/ai-insights"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/lib/app-context"
import {
  progressApi,
  sessionsApi,
  prescriptionsApi,
  type ProgressResponse,
  type SessionListItem,
  type Prescription,
} from "@/lib/api"
import { Calendar, Dumbbell, Flame, Target, ClipboardList } from "lucide-react"

export default function PatientDashboard() {
  const { selectedUserId, identity, role } = useApp()
  const router = useRouter()

  const [progress, setProgress] = useState<ProgressResponse | null>(null)
  const [recentSessions, setRecentSessions] = useState<SessionListItem[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (role !== "patient") {
      router.replace("/")
      return
    }
    if (!selectedUserId) return

    setLoading(true)
    Promise.all([
      progressApi.get(selectedUserId),
      sessionsApi.list(selectedUserId, 5),
      prescriptionsApi.list(selectedUserId).catch(() => [] as Prescription[]),
    ])
      .then(([prog, sessions, rx]) => {
        setProgress(prog)
        setRecentSessions(sessions.sessions)
        setPrescriptions(rx.filter((p) => p.status === "active"))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedUserId, role, router])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Welcome back, {identity?.name ?? "…"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Track your progress and continue your rehabilitation journey
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Sessions"
            value={loading ? "—" : String(progress?.summary.total_exercise_sessions ?? 0)}
            description="Exercise sessions"
            icon={Calendar}
          />
          <StatsCard
            title="Total Reps"
            value={loading ? "—" : (progress?.summary.total_reps ?? 0).toLocaleString()}
            description="All time"
            icon={Dumbbell}
          />
          <StatsCard
            title="Day Streak"
            value={loading ? "—" : String(progress?.summary.current_streak_days ?? 0)}
            description="Keep it going!"
            icon={Flame}
          />
          <StatsCard
            title="Avg Form Score"
            value={
              loading
                ? "—"
                : progress?.summary.avg_form_score != null
                ? `${Math.round(progress.summary.avg_form_score * 100)}%`
                : "N/A"
            }
            description="Last sessions"
            icon={Target}
          />
        </div>

        {/* Active Prescriptions */}
        {prescriptions.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Your Prescribed Plan</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {prescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="rounded-xl border border-border bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground text-sm">
                        {rx.exercise_name ?? rx.game_type ?? "Activity"}
                      </p>
                      <Badge
                        variant="secondary"
                        className={
                          rx.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : rx.priority === "low"
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary"
                        }
                      >
                        {rx.priority}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[
                        rx.target_reps ? `${rx.target_reps} reps` : null,
                        rx.frequency ?? null,
                        `${rx.compliance.sessions_completed} done`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProgressChart data={progress?.exercise_progress ?? []} loading={loading} />
          </div>
          <div>
            <AIInsights feedback={progress?.recent_feedback ?? []} loading={loading} />
          </div>
        </div>

        <RecentSessions sessions={recentSessions} loading={loading} />
      </div>
    </AppLayout>
  )
}
