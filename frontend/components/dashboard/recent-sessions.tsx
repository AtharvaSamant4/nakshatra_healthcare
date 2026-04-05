"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type SessionListItem } from "@/lib/api"
import { Clock, Dumbbell } from "lucide-react"

interface RecentSessionsProps {
  sessions: SessionListItem[]
  loading?: boolean
  /** Total exercise_sessions rows for this patient (may exceed `sessions.length`). */
  totalInDb?: number
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "—"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function accuracyLabel(score?: number): string {
  if (score == null) return "—"
  const pct = Math.round(score * 100)
  if (pct >= 90) return "Excellent"
  if (pct >= 80) return "Good"
  return "Keep Going"
}

function formatCompletedAt(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  } catch {
    return iso
  }
}

function accuracyBadgeClass(score?: number): string {
  if (score == null) return "bg-muted text-muted-foreground"
  const pct = score * 100
  if (pct >= 90) return "bg-accent/10 text-accent"
  if (pct >= 80) return "bg-primary/10 text-primary"
  return "bg-muted text-muted-foreground"
}

export function RecentSessions({ sessions, loading, totalInDb }: RecentSessionsProps) {
  const shown = sessions.length
  const total = totalInDb ?? shown
  const more = total > shown ? total - shown : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Sessions</CardTitle>
        <p className="text-xs text-muted-foreground">
          Each row is one saved workout. The chart above groups multiple sessions on the same day.
          {!loading && total > 0 && (
            <span className="mt-1 block font-medium text-foreground">
              Showing {shown} of {total} saved session{total === 1 ? "" : "s"}
              {more > 0 ? ` · ${more} more in your history` : ""}
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions yet. Start your first exercise!</p>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {session.exercise_name ?? "Exercise"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatDuration(session.duration_seconds)}</span>
                    <span>•</span>
                    <span>{formatCompletedAt(session.completed_at)}</span>
                    {session.progressive_quality != null && session.progressive_quality !== "" && (
                      <>
                        <span>•</span>
                        <span className="capitalize">ROM: {session.progressive_quality}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{session.reps_completed} reps</p>
                  <p className="text-xs text-muted-foreground">
                    {session.progressive_score != null
                      ? `${session.progressive_score}% ROM`
                      : session.form_score != null
                        ? `${Math.round(session.form_score * 100)}% form`
                        : "—"}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={accuracyBadgeClass(
                    session.form_score ??
                      (session.progressive_score != null
                        ? session.progressive_score / 100
                        : undefined)
                  )}
                >
                  {accuracyLabel(
                    session.form_score ??
                      (session.progressive_score != null
                        ? session.progressive_score / 100
                        : undefined)
                  )}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
