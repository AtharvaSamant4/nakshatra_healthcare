"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Square, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExerciseControlsProps {
  isActive: boolean
  repCount: number
  formQuality: "good" | "bad" | "neutral"
  onStart: () => void
  onStop: () => void
  onReset: () => void
}

export function ExerciseControls({
  isActive,
  repCount,
  formQuality,
  onStart,
  onStop,
  onReset,
}: ExerciseControlsProps) {
  return (
    <div className="space-y-4">
      {/* Rep Counter */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Reps</p>
            <p className="mt-2 text-6xl font-bold text-foreground">{repCount}</p>
          </div>
        </CardContent>
      </Card>

      {/* Form Quality Indicator */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Form Quality</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formQuality === "good"
                  ? "Great Form!"
                  : formQuality === "bad"
                  ? "Adjust Position"
                  : "Ready"}
              </p>
            </div>
            <Badge
              className={cn(
                "h-10 w-10 rounded-full p-0 flex items-center justify-center",
                formQuality === "good"
                  ? "bg-accent text-accent-foreground"
                  : formQuality === "bad"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {formQuality === "good" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : formQuality === "bad" ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <div className="h-3 w-3 rounded-full bg-current" />
              )}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Control Buttons */}
      <div className="flex gap-3">
        {!isActive ? (
          <Button
            onClick={onStart}
            size="lg"
            className="flex-1 h-14 text-lg font-semibold bg-primary hover:bg-primary/90"
          >
            <Play className="mr-2 h-5 w-5" />
            Start Session
          </Button>
        ) : (
          <Button
            onClick={onStop}
            size="lg"
            variant="destructive"
            className="flex-1 h-14 text-lg font-semibold"
          >
            <Square className="mr-2 h-5 w-5" />
            Stop Session
          </Button>
        )}
        <Button
          onClick={onReset}
          size="lg"
          variant="outline"
          className="h-14 w-14"
          disabled={repCount === 0}
        >
          <RotateCcw className="h-5 w-5" />
          <span className="sr-only">Reset</span>
        </Button>
      </div>
    </div>
  )
}
