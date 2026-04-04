"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { aiApi, type PatientReport } from "@/lib/api"
import { useApp } from "@/lib/app-context"
import { FileText, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

const TREND_CONFIG = {
  improving: { icon: TrendingUp,   color: "text-green-600",  label: "Improving",  badge: "bg-green-100 text-green-700" },
  stable:    { icon: Minus,        color: "text-yellow-600", label: "Stable",     badge: "bg-yellow-100 text-yellow-700" },
  declining: { icon: TrendingDown, color: "text-red-600",    label: "Declining",  badge: "bg-red-100 text-red-700" },
}

const RISK_CONFIG = {
  low:    { label: "Low Risk",    badge: "bg-green-100 text-green-700" },
  medium: { label: "Medium Risk", badge: "bg-yellow-100 text-yellow-700" },
  high:   { label: "High Risk",   badge: "bg-red-100 text-red-700",    icon: AlertTriangle },
}

export default function PatientReportsPage() {
  const { selectedUserId } = useApp()
  const [reports, setReports] = useState<PatientReport[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    if (!selectedUserId) return
    fetchReports()
  }, [selectedUserId])

  async function fetchReports() {
    if (!selectedUserId) return
    setLoading(true)
    try {
      const data = await aiApi.listReports(selectedUserId)
      setReports(data)
      setActiveIdx(0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    if (!selectedUserId) return
    setGenerating(true)
    try {
      await aiApi.generateReport(selectedUserId)
      await fetchReports()
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const report = reports[activeIdx]?.report ?? null

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              My Reports
            </h1>
            <p className="mt-1 text-muted-foreground">
              AI-generated rehabilitation progress reports
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 sm:w-auto w-full"
          >
            <RefreshCw className={cn("h-4 w-4", generating && "animate-spin")} />
            {generating ? "Generating…" : "Generate New Report"}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading reports…</p>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">No reports yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Generate your first AI report to see your progress summary.
                </p>
              </div>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? "Generating…" : "Generate Report"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Report list sidebar */}
            <div className="space-y-2">
              {reports.map((r, i) => (
                <button
                  key={r.id ?? i}
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3 transition-colors",
                    i === activeIdx
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {i === 0 ? "Latest Report" : `Report ${reports.length - i}`}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Active report */}
            {report && (
              <div className="lg:col-span-3 space-y-4">
                {/* Summary card */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">Progress Summary</CardTitle>
                      {report.progress_trend && (() => {
                        const cfg = TREND_CONFIG[report.progress_trend]
                        if (!cfg) return null;
                        const Icon = cfg.icon
                        return (
                          <Badge variant="secondary" className={cn("flex items-center gap-1", cfg.badge)}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                        )
                      })()}
                      {report.risk_level && (() => {
                        const cfg = RISK_CONFIG[report.risk_level]
                        return (
                          <Badge variant="secondary" className={cn("flex items-center gap-1", cfg.badge)}>
                            {cfg.label}
                          </Badge>
                        )
                      })()}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground leading-relaxed">{report.summary}</p>
                  </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Key Issues */}
                  {report.key_issues?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          Key Issues
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1.5">
                          {report.key_issues.map((issue, i) => (
                            <li key={i} className="text-sm text-foreground flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendations */}
                  {report.recommendations?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1.5">
                          {report.recommendations.map((rec, i) => (
                            <li key={i} className="text-sm text-foreground flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Next plan */}
                {report.next_plan && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold text-primary mb-1">Next Phase Plan</p>
                      <p className="text-sm text-foreground leading-relaxed">{report.next_plan}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
