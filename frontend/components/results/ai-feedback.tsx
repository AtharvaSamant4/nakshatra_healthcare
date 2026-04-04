import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type RecentFeedbackItem } from "@/lib/api"
import { Sparkles, Brain, Target } from "lucide-react"

interface AIFeedbackProps {
  feedback: RecentFeedbackItem[]
  loading?: boolean
}

export function AIFeedback({ feedback, loading }: AIFeedbackProps) {
  const items = feedback.filter((item) => item.summary).slice(0, 3)

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          AI Performance Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Complete sessions to receive AI performance analysis.
          </p>
        ) : (
          items.map((item) => {
            const isExercise = item.session_type === "exercise"
            const Icon = isExercise ? Target : Brain

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card/50 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground">
                        {isExercise ? "Exercise Insight" : "Game Insight"}
                      </h4>
                      <Badge
                        variant="secondary"
                        className={
                          item.recovery_score != null
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {item.recovery_score != null
                          ? `Score ${item.recovery_score}/10`
                          : isExercise
                          ? "Exercise"
                          : "Game"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      {item.summary}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
