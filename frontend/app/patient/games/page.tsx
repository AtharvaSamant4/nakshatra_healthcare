"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { MemoryGame } from "@/components/games/memory-game"
import { ReactionGame } from "@/components/games/reaction-game"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { gameSessionsApi, prescriptionsApi, type GameSessionListItem, type Prescription } from "@/lib/api"
import { useApp } from "@/lib/app-context"
import { Brain, Zap, Trophy, Clock, Gamepad2 } from "lucide-react"

interface GameScore {
  type: "memory" | "reaction"
  score: number
  time?: number
  moves?: number
  avgTime?: number
  rounds?: number
}

export default function PatientGamesPage() {
  const { selectedUserId, role } = useApp()
  const router = useRouter()

  const [lastScore, setLastScore] = useState<GameScore | null>(null)
  const [memorySessions, setMemorySessions] = useState<GameSessionListItem[]>([])
  const [reactionSessions, setReactionSessions] = useState<GameSessionListItem[]>([])
  const [prescribedGameTypes, setPrescribedGameTypes] = useState<Set<string>>(new Set())
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    if (role !== "patient") {
      router.replace("/")
      return
    }
  }, [role, router])

  useEffect(() => {
    if (!selectedUserId) return
    setStatsLoading(true)
    Promise.all([
      gameSessionsApi.list(selectedUserId, "memory", 50),
      gameSessionsApi.list(selectedUserId, "reaction", 50),
      prescriptionsApi.list(selectedUserId).catch(() => [] as Prescription[]),
    ])
      .then(([mem, react, rx]) => {
        setMemorySessions(mem.sessions)
        setReactionSessions(react.sessions)
        const gameTypes = new Set(
          rx
            .filter((p) => p.status === "active" && p.game_type)
            .map((p) => p.game_type as string)
        )
        setPrescribedGameTypes(gameTypes)
      })
      .catch(console.error)
      .finally(() => setStatsLoading(false))
  }, [selectedUserId])

  // Show all tabs if no game prescriptions exist; otherwise filter to prescribed types
  const showMemory = prescribedGameTypes.size === 0 || prescribedGameTypes.has("memory")
  const showReaction = prescribedGameTypes.size === 0 || prescribedGameTypes.has("reaction")
  const defaultTab = showMemory ? "memory" : showReaction ? "reaction" : "memory"

  const handleMemoryComplete = useCallback(
    async (score: number, time: number, moves: number) => {
      setLastScore({ type: "memory", score, time, moves })
      if (!selectedUserId) return
      try {
        await gameSessionsApi.create({
          user_id: selectedUserId,
          game_type: "memory",
          score,
          duration_seconds: time,
          game_metadata: { moves },
        })
        const updated = await gameSessionsApi.list(selectedUserId, "memory", 50)
        setMemorySessions(updated.sessions)
      } catch (err) {
        console.error("Failed to save memory game session:", err)
      }
    },
    [selectedUserId]
  )

  const handleReactionComplete = useCallback(
    async (score: number, avgTime: number, rounds: number) => {
      setLastScore({ type: "reaction", score, avgTime, rounds })
      if (!selectedUserId) return
      try {
        await gameSessionsApi.create({
          user_id: selectedUserId,
          game_type: "reaction",
          score,
          avg_reaction_ms: avgTime,
          game_metadata: { rounds },
        })
        const updated = await gameSessionsApi.list(selectedUserId, "reaction", 50)
        setReactionSessions(updated.sessions)
      } catch (err) {
        console.error("Failed to save reaction game session:", err)
      }
    },
    [selectedUserId]
  )

  const bestMemoryDuration =
    memorySessions.length > 0
      ? Math.min(
          ...memorySessions
            .map((s) => s.duration_seconds ?? Infinity)
            .filter((v) => v !== Infinity)
        )
      : null

  const bestReactionScore =
    reactionSessions.length > 0
      ? Math.max(...reactionSessions.map((s) => s.score))
      : null

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Brain Training Games</h1>
          <p className="mt-1 text-muted-foreground">
            {prescribedGameTypes.size > 0
              ? "Showing your prescribed cognitive exercises"
              : "Keep your mind sharp with cognitive exercises"}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Memory Games</p>
                  <p className="text-lg font-semibold text-foreground">
                    {statsLoading ? "—" : memorySessions.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Zap className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reaction Games</p>
                  <p className="text-lg font-semibold text-foreground">
                    {statsLoading ? "—" : reactionSessions.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Best Memory Time</p>
                  <p className="text-lg font-semibold text-foreground">
                    {statsLoading
                      ? "—"
                      : bestMemoryDuration != null
                      ? formatDuration(bestMemoryDuration)
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Trophy className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Best Reaction</p>
                  <p className="text-lg font-semibold text-foreground">
                    {statsLoading
                      ? "—"
                      : bestReactionScore != null
                      ? `${bestReactionScore} pts`
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {lastScore && (
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                    <Trophy className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Game Score</p>
                    <p className="text-lg font-semibold text-foreground">{lastScore.score} points</p>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {lastScore.type === "memory" ? (
                    <span>
                      Time: {Math.floor((lastScore.time || 0) / 60)}:
                      {((lastScore.time || 0) % 60).toString().padStart(2, "0")} | Moves:{" "}
                      {lastScore.moves}
                    </span>
                  ) : (
                    <span>Avg: {lastScore.avgTime}ms | Rounds: {lastScore.rounds}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
            {showMemory && (
              <TabsTrigger value="memory" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Memory Game
              </TabsTrigger>
            )}
            {showReaction && (
              <TabsTrigger value="reaction" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Reaction Game
              </TabsTrigger>
            )}
          </TabsList>
          {showMemory && (
            <TabsContent value="memory">
              <MemoryGame onComplete={handleMemoryComplete} />
            </TabsContent>
          )}
          {showReaction && (
            <TabsContent value="reaction">
              <ReactionGame onComplete={handleReactionComplete} />
            </TabsContent>
          )}
        </Tabs>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Gamepad2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">How Games Help Your Recovery</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Cognitive exercises strengthen neural pathways, improve focus, and enhance
                  hand-eye coordination — supporting your overall rehabilitation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
