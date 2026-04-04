"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, Dumbbell, Target, Home, RotateCcw } from "lucide-react"
import Link from "next/link"

interface SessionSummaryProps {
  reps: number
  duration: number
  accuracy: number
  onNewSession: () => void
}

export function SessionSummary({
  reps,
  duration,
  accuracy,
  onNewSession,
}: SessionSummaryProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <CheckCircle2 className="h-8 w-8 text-accent" />
        </div>
        <CardTitle className="text-2xl font-bold">Session Complete!</CardTitle>
        <p className="text-muted-foreground">Great work on your exercise session</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Dumbbell className="h-6 w-6 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{reps}</p>
            <p className="text-xs text-muted-foreground">Reps</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{formatDuration(duration)}</p>
            <p className="text-xs text-muted-foreground">Duration</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{accuracy}%</p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
        </div>

        <div className="rounded-xl bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Performance</span>
            <Badge
              className={
                accuracy >= 90
                  ? "bg-accent/10 text-accent"
                  : accuracy >= 80
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }
            >
              {accuracy >= 90 ? "Excellent" : accuracy >= 80 ? "Good" : "Keep Practicing"}
            </Badge>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onNewSession}
            variant="outline"
            className="flex-1"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            New Session
          </Button>
          <Button asChild className="flex-1">
            <Link href="/results">
              View Results
            </Link>
          </Button>
        </div>

        <Button asChild variant="ghost" className="w-full">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
