"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ExerciseProgressDay } from "@/lib/api"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface ProgressChartProps {
  data: ExerciseProgressDay[]
  loading?: boolean
}

export function ProgressChart({ data, loading }: ProgressChartProps) {
  // Map API shape → chart shape
  const chartData = data.map((d) => ({
    day: d.date.slice(5), // "MM-DD"
    reps: d.total_reps,
    accuracy: d.avg_form_score != null ? Math.round(d.avg_form_score * 100) : null,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Exercise Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
            Loading…
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
            No sessions yet. Complete your first exercise to see progress here.
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="repsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.55 0.15 200)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.55 0.15 200)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.18 165)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.65 0.18 165)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(1 0 0)",
                    border: "1px solid oklch(0.90 0.02 200)",
                    borderRadius: "0.75rem",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  labelStyle={{ color: "oklch(0.15 0.02 220)", fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="reps"
                  stroke="oklch(0.55 0.15 200)"
                  strokeWidth={2}
                  fill="url(#repsGradient)"
                  name="Reps"
                />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke="oklch(0.65 0.18 165)"
                  strokeWidth={2}
                  fill="url(#accuracyGradient)"
                  name="Form %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {!loading && chartData.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground">Reps</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-accent" />
              <span className="text-sm text-muted-foreground">Form %</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
