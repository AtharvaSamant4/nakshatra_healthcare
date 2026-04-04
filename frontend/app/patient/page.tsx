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
  aiApi,
  type ProgressResponse,
  type SessionListItem,
  type Prescription,
  type RecommendationJson,
} from "@/lib/api"
import { Calendar, Dumbbell, Flame, Target, ClipboardList, Timer } from "lucide-react"
import { PatientChat } from "@/components/ai/patient-chat"
import { AIRecommendation } from "@/components/dashboard/ai-recommendation"

export default function PatientDashboard() {
  const { selectedUserId, identity, role } = useApp()
  const router = useRouter()

  const [progress, setProgress] = useState<ProgressResponse | null>(null)
  const [recentSessions, setRecentSessions] = useState<SessionListItem[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [recommendation, setRecommendation] = useState<RecommendationJson | null>(null)
  const [recoveryDays, setRecoveryDays] = useState<{ estimated_days: number | null; confidence: string } | null>(null)
  const [adaptivePlan, setAdaptivePlan] = useState<{ reps: number; sets: number; intensity: string; reason: string; } | null>(null)
  const [riskAssessment, setRiskAssessment] = useState<{ risk_level: string; reasons: string[] } | null>(null)
  const [recoveryScore, setRecoveryScore] = useState<number | null>(null)
  const [improvement, setImprovement] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (role !== "patient") {
      router.replace("/login")
      return
    }
    if (!selectedUserId) return

    setLoading(true)
    Promise.all([
      progressApi.get(selectedUserId),
      sessionsApi.list(selectedUserId, 5),
      prescriptionsApi.list(selectedUserId).catch(() => [] as Prescription[]),
      aiApi.listRecommendations(selectedUserId).catch(() => []),
      aiApi.recoveryPrediction(selectedUserId).catch(() => null),
      aiApi.adaptivePlan(selectedUserId).catch(() => null),
      aiApi.calculateRisk(selectedUserId).catch(() => null),
      aiApi.recoveryScore(selectedUserId).catch(() => null),
      progressApi.improvement(selectedUserId).catch(() => null),
    ])
      .then(async ([prog, sessions, rx, recs, recovery, adaptive, risk, recScore, impData]) => {
        setProgress(prog)
        setRecentSessions(sessions.sessions)
        setPrescriptions(rx.filter((p) => p.status === "active"))

        if (recs.length > 0) {
          setRecommendation(recs[0].recommendation)
        } else {
          // No recommendation exists yet — auto-generate one silently
          try {
            const generated = await aiApi.recommendPlan(selectedUserId)
            if (generated?.recommendation) setRecommendation(generated.recommendation)
          } catch {
            // Silently ignore — component shows fallback message
          }
        }

        if (recovery) setRecoveryDays({ estimated_days: recovery.estimated_days, confidence: recovery.confidence })
        if (adaptive) setAdaptivePlan(adaptive)
        if (risk) setRiskAssessment(risk)
        if (recScore) setRecoveryScore(recScore.recovery_score)
        if (impData) setImprovement(impData.improvement)
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                      <StatsCard
              title="Recovery Score"
              value={loading ? "—" : recoveryScore != null ? `${recoveryScore}/100` : "N/A"}
              description={improvement != null ? `${improvement > 0 ? "+" : ""}${improvement}% improvement from last week` : "Overall rating"}
              icon={Target}
            />
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
          <StatsCard
            title="Estimated recovery"
            value={
              loading
                ? "—"
                : recoveryDays?.estimated_days != null
                ? `${recoveryDays.estimated_days} days`
                : "N/A"
            }
            description={
              recoveryDays?.confidence
                ? `${recoveryDays.confidence} confidence`
                : "Need more sessions"
            }
            icon={Timer}
          />
        </div>

          {/* Risk Assessment */}
          {riskAssessment && riskAssessment.risk_level === 'high' && (
            <Card className="border-red-500/50 shadow-sm mt-6 mb-6 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader>
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <span className="text-xl"></span>
                  <CardTitle className="text-lg">High Risk</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1 text-red-800 dark:text-red-200">
                  {riskAssessment.reasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* AI Adaptive Plan */}
          {adaptivePlan && (
            <Card className="border-primary/50 shadow-sm mt-6 mb-6">
              <CardHeader className="bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">AI Adaptive Plan</CardTitle>
                  </div>
                  <Badge variant="default">Auto-adjusted</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-primary mb-4">
                  AI adjusted your plan based on performance
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Sets &amp; Reps</p>
                    <p className="font-bold text-foreground text-lg">{adaptivePlan.sets} &times; {adaptivePlan.reps}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Intensity</p>
                    <p className="font-bold text-foreground text-lg capitalize">{adaptivePlan.intensity}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3 sm:col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Reasoning</p>
                    <p className="font-medium text-foreground text-sm">{adaptivePlan.reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}






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

        <AIRecommendation
          recommendation={recommendation}
          loading={loading}
          patientId={selectedUserId ?? undefined}
          onRefresh={(rec) => setRecommendation(rec)}
        />

        <RecentSessions sessions={recentSessions} loading={loading} />

        {/* AI Therapist Chat */}
        {selectedUserId && (
          <PatientChat patientId={selectedUserId} />
        )}
      </div>
    </AppLayout>
  )
}





