"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type RecentFeedbackItem } from "@/lib/api"
import { Sparkles, ChevronRight } from "lucide-react"
import { useState } from "react"

interface AIInsightsProps {
  feedback: RecentFeedbackItem[]
  loading?: boolean
}

export function AIInsights({ feedback, loading }: AIInsightsProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const insights = feedback
    .filter((f) => f.summary)
    .map((f) => f.summary as string)

  const nextInsight = () => {
    setCurrentIndex((prev) => (prev + 1) % insights.length)
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Complete a session to receive AI-powered insights.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-base text-foreground leading-relaxed">
              {insights[currentIndex]}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {insights.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      index === currentIndex
                        ? "bg-primary"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                    aria-label={`Go to insight ${index + 1}`}
                  />
                ))}
              </div>
              {insights.length > 1 && (
                <button
                  onClick={nextInsight}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Next tip
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
