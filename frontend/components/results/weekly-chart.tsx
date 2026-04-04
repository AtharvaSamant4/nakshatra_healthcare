"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ExerciseProgressDay } from "@/lib/api"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface WeeklyChartProps {
  data: ExerciseProgressDay[]
  loading?: boolean
}

export function WeeklyChart({ data, loading }: WeeklyChartProps) {
  const chartData = data.map((d) => ({
    week: d.date.slice(5), // "MM-DD"
    sessions: d.sessions,
    avgAccuracy: d.avg_form_score != null ? Math.round(d.avg_form_score * 100) : null,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Weekly Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
            Loading…
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
            No data yet.
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="week"
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
                <Legend />
                <Bar
                  dataKey="sessions"
                  fill="oklch(0.55 0.15 200)"
                  radius={[4, 4, 0, 0]}
                  name="Sessions"
                />
                <Bar
                  dataKey="avgAccuracy"
                  fill="oklch(0.65 0.18 165)"
                  radius={[4, 4, 0, 0]}
                  name="Avg Accuracy %"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
