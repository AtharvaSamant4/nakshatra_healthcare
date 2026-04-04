"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Zap, RotateCcw, Trophy } from "lucide-react"

type GameState = "waiting" | "ready" | "go" | "clicked" | "too-early" | "complete"

interface ReactionGameProps {
  onComplete: (score: number, avgTime: number, rounds: number) => void
}

export function ReactionGame({ onComplete }: ReactionGameProps) {
  const [gameState, setGameState] = useState<GameState>("waiting")
  const [startTime, setStartTime] = useState(0)
  const [reactionTime, setReactionTime] = useState<number | null>(null)
  const [results, setResults] = useState<number[]>([])
  const [round, setRound] = useState(0)
  const [totalRounds] = useState(5)

  const startRound = useCallback(() => {
    setGameState("ready")
    setReactionTime(null)

    const delay = Math.random() * 3000 + 1500 // 1.5 to 4.5 seconds
    const timeout = setTimeout(() => {
      setGameState("go")
      setStartTime(Date.now())
    }, delay)

    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (gameState === "ready") {
      const delay = Math.random() * 3000 + 1500
      const timeout = setTimeout(() => {
        setGameState("go")
        setStartTime(Date.now())
      }, delay)
      return () => clearTimeout(timeout)
    }
  }, [gameState])

  const handleClick = () => {
    if (gameState === "waiting") {
      setRound(1)
      setResults([])
      startRound()
    } else if (gameState === "ready") {
      setGameState("too-early")
    } else if (gameState === "go") {
      const time = Date.now() - startTime
      setReactionTime(time)
      setGameState("clicked")
      const newResults = [...results, time]
      setResults(newResults)

      if (round >= totalRounds) {
        setGameState("complete")
        const avgTime = Math.round(newResults.reduce((a, b) => a + b, 0) / newResults.length)
        const score = Math.max(1000 - avgTime * 2, 100)
        onComplete(score, avgTime, totalRounds)
      }
    } else if (gameState === "too-early") {
      startRound()
    } else if (gameState === "clicked") {
      if (round < totalRounds) {
        setRound((prev) => prev + 1)
        startRound()
      }
    }
  }

  const resetGame = () => {
    setGameState("waiting")
    setResults([])
    setRound(0)
    setReactionTime(null)
  }

  const getBackgroundColor = () => {
    switch (gameState) {
      case "ready":
        return "bg-destructive/10"
      case "go":
        return "bg-accent/10"
      case "too-early":
        return "bg-destructive/20"
      case "clicked":
        return "bg-primary/10"
      default:
        return "bg-muted"
    }
  }

  const getMessage = () => {
    switch (gameState) {
      case "waiting":
        return { title: "Click to Start", subtitle: "Test your reaction time" }
      case "ready":
        return { title: "Wait...", subtitle: "Click when the screen turns green" }
      case "go":
        return { title: "Click Now!", subtitle: "" }
      case "too-early":
        return { title: "Too Early!", subtitle: "Click to try again" }
      case "clicked":
        return {
          title: `${reactionTime}ms`,
          subtitle: round < totalRounds ? "Click to continue" : "Game complete!",
        }
      case "complete":
        return {
          title: "Game Complete!",
          subtitle: `Average: ${Math.round(results.reduce((a, b) => a + b, 0) / results.length)}ms`,
        }
      default:
        return { title: "", subtitle: "" }
    }
  }

  const message = getMessage()
  const avgTime = results.length > 0
    ? Math.round(results.reduce((a, b) => a + b, 0) / results.length)
    : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Reaction Time</CardTitle>
          <div className="flex items-center gap-4">
            {round > 0 && (
              <Badge variant="secondary">
                Round {Math.min(round, totalRounds)}/{totalRounds}
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={resetGame}>
              <RotateCcw className="h-4 w-4" />
              <span className="sr-only">Reset game</span>
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Click as fast as you can when the target appears
        </p>
      </CardHeader>
      <CardContent>
        {gameState === "complete" ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                {avgTime < 500 ? (
                  <Trophy className="h-8 w-8 text-accent" />
                ) : avgTime < 1000 ? (
                  <div className="h-8 w-8 text-accent">👍</div>
                ) : (
                  <div className="h-8 w-8 text-accent">📈</div>
                )}
              </div>
              <h3 className="text-xl font-bold text-foreground">
                {avgTime < 350 ? "Lightning Fast!" : avgTime < 600 ? "Great Job!" : avgTime < 1500 ? "Good Effort!" : "Keep Practicing!"}
              </h3>
            <p className="mt-2 text-muted-foreground">
              Average reaction time: {avgTime}ms
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {results.map((time, index) => (
                <Badge key={index} variant="outline">
                  R{index + 1}: {time}ms
                </Badge>
              ))}
            </div>
            <Button onClick={resetGame} className="mt-6">
              Play Again
            </Button>
          </div>
        ) : (
          <button
            onClick={handleClick}
            className={cn(
              "w-full rounded-2xl p-12 transition-colors cursor-pointer",
              getBackgroundColor()
            )}
          >
            <div className="flex flex-col items-center justify-center">
              {gameState === "go" ? (
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent animate-pulse">
                  <Zap className="h-10 w-10 text-accent-foreground" />
                </div>
              ) : (
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <Zap className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <h3 className="text-2xl font-bold text-foreground">{message.title}</h3>
              {message.subtitle && (
                <p className="mt-2 text-muted-foreground">{message.subtitle}</p>
              )}
            </div>
          </button>
        )}

        {results.length > 0 && gameState !== "complete" && (
          <div className="mt-4 flex justify-center gap-2">
            {results.map((time, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {time}ms
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
