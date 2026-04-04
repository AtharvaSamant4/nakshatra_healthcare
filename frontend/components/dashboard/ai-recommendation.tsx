"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type RecommendationJson, aiApi } from "@/lib/api"
import {
  Brain, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Dumbbell, RefreshCw, ChevronRight,
  Activity, Target, Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Config ───────────────────────────────────────────────────────────────────

const INTENSITY_CONFIG = {
  increase: { icon: TrendingUp,   label: "Increase intensity",  pill: "bg-green-100 text-green-700 border-green-200",  dot: "bg-green-500" },
  maintain: { icon: Minus,        label: "Maintain intensity",  pill: "bg-blue-100 text-blue-700 border-blue-200",    dot: "bg-blue-500"  },
  decrease: { icon: TrendingDown, label: "Decrease intensity",  pill: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
}

const DEFAULT_EXERCISES = [
  { name: "Shoulder Flexion",   sets: 3, reps: 10, reason: "Core prescribed exercise for shoulder mobility" },
  { name: "Shoulder Abduction", sets: 3, reps: 10, reason: "Improves lateral range of motion" },
  { name: "Elbow Flexion",      sets: 2, reps: 12, reason: "Supports joint strength recovery" },
]

interface AIRecommendationProps {
  recommendation: RecommendationJson | null
  loading?: boolean
  patientId?: string
  onRefresh?: (rec: RecommendationJson) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AIRecommendation({ recommendation, loading, patientId, onRefresh }: AIRecommendationProps) {
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    if (!patientId) return
    setGenerating(true)
    try {
      const result = await aiApi.recommendPlan(patientId)
      if (result?.recommendation && onRefresh) onRefresh(result.recommendation)
    } catch (e) {
      console.error("Failed to generate recommendation", e)
    } finally {
      setGenerating(false)
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              AI Recommended Plan
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="h-16 rounded-lg bg-muted" />
              <div className="h-16 rounded-lg bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── No recommendation at all ───────────────────────────────────────────────
  if (!recommendation) {
    return (
      <Card className="border-dashed border-primary/20">
        <CardContent className="py-8 flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">No AI Plan Yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Complete a few sessions and let the AI analyse your progress to generate a personalised exercise plan.
            </p>
          </div>
          {patientId && (
            <Button size="sm" onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
              {generating ? "Generating…" : "Generate My Plan"}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // ── Normalise data (handle empty Gemini response gracefully) ───────────────
  const intensity    = (recommendation.intensity as keyof typeof INTENSITY_CONFIG) ?? "maintain"
  const intensityCfg = INTENSITY_CONFIG[intensity] ?? INTENSITY_CONFIG.maintain
  const IntensityIcon = intensityCfg.icon
  const compositePercent = Math.round((recommendation.composite_score ?? 0) * 100)
  const warnings   = Array.isArray(recommendation.warnings)              ? recommendation.warnings              : []
  const exercises = (Array.isArray(recommendation.recommended_exercises) ? recommendation.recommended_exercises : [])
    .filter((ex): ex is { name: string; sets: number; reps: number; reason: string } => typeof ex === "object" && ex !== null)
  const showExercises = exercises.length > 0 ? exercises : DEFAULT_EXERCISES
  const reasoning  = recommendation.reasoning || "Based on your recent session data, this plan has been tailored to support your current recovery stage."

  // ─── Full card ──────────────────────────────────────────────────────────────
  return (
    <Card className="overflow-hidden border-primary/10">
      {/* Coloured top strip */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/60 to-primary/20" />

      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base leading-tight">AI Recommended Plan</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Personalised based on your progress</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Intensity pill */}
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
              intensityCfg.pill
            )}>
              <IntensityIcon className="h-3 w-3" />
              {intensityCfg.label}
            </span>

            {/* Composite score pill */}
            {compositePercent > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                <Activity className="h-3 w-3" />
                {compositePercent}% composite score
              </span>
            )}

            {/* Refresh button */}
            {patientId && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={handleGenerate}
                disabled={generating}
                title="Regenerate plan"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", generating && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pb-5">

        {/* Reasoning */}
        <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3">
          {reasoning}
        </p>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-amber-800">Attention</p>
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-700">{w}</p>
              ))}
            </div>
          </div>
        )}

        {/* Exercises grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recommended Exercises
            </p>
            {exercises.length === 0 && (
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Based on prescription
              </span>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {showExercises.map((ex, i) => (
              <div
                key={i}
                className="group relative flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3.5 hover:border-primary/30 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                    <Dumbbell className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{ex.name}</p>
                </div>

                <div className="flex items-center gap-3 mt-0.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    <Target className="h-3 w-3" />
                    {ex.sets} sets
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    <Zap className="h-3 w-3" />
                    {ex.reps} reps
                  </span>
                </div>

                {ex.reason && (
                  <p className="text-xs text-muted-foreground leading-snug">{ex.reason}</p>
                )}

                <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/50 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
