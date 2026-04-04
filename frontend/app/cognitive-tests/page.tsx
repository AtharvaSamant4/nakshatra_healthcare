"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { AttentionReactionTest } from "@/components/cognitive-tests/attention-reaction-test"
import { MemoryRecallTest } from "@/components/cognitive-tests/memory-recall-test"
import { SentenceRepetitionTest } from "@/components/cognitive-tests/sentence-repetition-test"
import { VerbalFluencyTest } from "@/components/cognitive-tests/verbal-fluency-test"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cognitiveTestsApi, type CognitiveTestListItem } from "@/lib/api"
import { useUser } from "@/lib/user-context"
import { Brain, Clock, Mic, Sparkles, Timer, Trophy } from "lucide-react"

type TestType =
  | "memory_recall"
  | "verbal_fluency"
  | "attention_reaction"
  | "sentence_repetition"

interface LastScore {
  testType: TestType
  score: number
  accuracy: number
  metricLabel: string
  metricValue: string
}

function testLabel(testType: TestType): string {
  if (testType === "memory_recall") return "Memory Recall"
  if (testType === "verbal_fluency") return "Verbal Fluency"
  if (testType === "attention_reaction") return "Attention & Reaction"
  return "Sentence Repetition"
}

export default function CognitiveTestsPage() {
  const { selectedUserId } = useUser()
  const [sessions, setSessions] = useState<CognitiveTestListItem[]>([])
  const [statsLoading, setStatsLoading] = useState(false)
  const [lastScore, setLastScore] = useState<LastScore | null>(null)

  const refreshSessions = useCallback(async () => {
    if (!selectedUserId) {
      setSessions([])
      return
    }

    setStatsLoading(true)
    try {
      const res = await cognitiveTestsApi.list(selectedUserId, undefined, 100)
      setSessions(res.sessions)
    } catch (error) {
      console.error("Failed to load cognitive test sessions:", error)
      setSessions([])
    } finally {
      setStatsLoading(false)
    }
  }, [selectedUserId])

  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  const handleSave = useCallback(
    async (
      testType: TestType,
      score: number,
      accuracy: number,
      responseTimeMs: number | undefined,
      wordCount: number | undefined,
      metadata: Record<string, unknown>
    ) => {
      if (!selectedUserId) return

      const metadataDuration = metadata.duration_seconds
      const durationSeconds =
        typeof metadataDuration === "number" ? Math.round(metadataDuration) : undefined

      const transcript = typeof metadata.transcript === "string" ? metadata.transcript : undefined

      const expectedResponse = (() => {
        if (typeof metadata.expected_response === "string") return metadata.expected_response
        if (Array.isArray(metadata.words_presented)) {
          return metadata.words_presented.join(", ")
        }
        return undefined
      })()

      try {
        await cognitiveTestsApi.create({
          user_id: selectedUserId,
          test_type: testType,
          score,
          accuracy,
          response_time_ms: responseTimeMs,
          word_count: wordCount,
          duration_seconds: durationSeconds,
          transcript,
          expected_response: expectedResponse,
          test_metadata: metadata,
        })
        await refreshSessions()
      } catch (error) {
        console.error("Failed to save cognitive test session:", error)
      }
    },
    [refreshSessions, selectedUserId]
  )

  const handleMemoryComplete = useCallback(
    async (
      score: number,
      accuracy: number,
      responseTimeMs: number,
      metadata: Record<string, unknown>
    ) => {
      const wordsRecalled = Array.isArray(metadata.words_recalled) ? metadata.words_recalled : []
      setLastScore({
        testType: "memory_recall",
        score,
        accuracy,
        metricLabel: "Response Time",
        metricValue: responseTimeMs > 0 ? `${(responseTimeMs / 1000).toFixed(1)}s` : "-",
      })

      await handleSave(
        "memory_recall",
        score,
        accuracy,
        responseTimeMs,
        wordsRecalled.length,
        metadata
      )
    },
    [handleSave]
  )

  const handleVerbalComplete = useCallback(
    async (
      score: number,
      accuracy: number,
      wordCount: number,
      metadata: Record<string, unknown>
    ) => {
      setLastScore({
        testType: "verbal_fluency",
        score,
        accuracy,
        metricLabel: "Unique Words",
        metricValue: `${wordCount}`,
      })

      await handleSave("verbal_fluency", score, accuracy, undefined, wordCount, metadata)
    },
    [handleSave]
  )

  const handleAttentionComplete = useCallback(
    async (
      score: number,
      accuracy: number,
      avgReactionMs: number,
      metadata: Record<string, unknown>
    ) => {
      setLastScore({
        testType: "attention_reaction",
        score,
        accuracy,
        metricLabel: "Avg Reaction",
        metricValue: `${avgReactionMs}ms`,
      })

      await handleSave("attention_reaction", score, accuracy, avgReactionMs, undefined, metadata)
    },
    [handleSave]
  )

  const handleSentenceComplete = useCallback(
    async (
      score: number,
      accuracy: number,
      avgSimilarity: number,
      metadata: Record<string, unknown>
    ) => {
      setLastScore({
        testType: "sentence_repetition",
        score,
        accuracy,
        metricLabel: "Avg Similarity",
        metricValue: `${Math.round(avgSimilarity * 100)}%`,
      })

      await handleSave("sentence_repetition", score, accuracy, undefined, undefined, metadata)
    },
    [handleSave]
  )

  const totalTests = sessions.length
  const bestScore = useMemo(() => {
    if (sessions.length === 0) return null
    return Math.max(...sessions.map((session) => session.score))
  }, [sessions])

  const recentAvg = useMemo(() => {
    if (sessions.length === 0) return null
    const recent = sessions.slice(0, 10)
    const avg = recent.reduce((sum, item) => sum + item.score, 0) / recent.length
    return Math.round(avg)
  }, [sessions])

  const fastestResponse = useMemo(() => {
    const values = sessions
      .map((session) => session.response_time_ms)
      .filter((value): value is number => value != null && value > 0)

    if (values.length === 0) return null
    return Math.min(...values)
  }, [sessions])

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Voice Cognitive Tests</h1>
          <p className="mt-1 text-muted-foreground">
            Assess memory, fluency, attention, and repetition with guided voice-based tests.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Mic className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tests</p>
                  <p className="text-lg font-semibold text-foreground">{statsLoading ? "-" : totalTests}</p>
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
                  <p className="text-sm text-muted-foreground">Best Score</p>
                  <p className="text-lg font-semibold text-foreground">
                    {statsLoading ? "-" : bestScore != null ? `${bestScore}/100` : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recent Average</p>
                  <p className="text-lg font-semibold text-foreground">
                    {statsLoading ? "-" : recentAvg != null ? `${recentAvg}/100` : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Timer className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fastest Response</p>
                  <p className="text-lg font-semibold text-foreground">
                    {statsLoading
                      ? "-"
                      : fastestResponse != null
                      ? `${(fastestResponse / 1000).toFixed(1)}s`
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {lastScore && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Cognitive Test</p>
                    <p className="text-lg font-semibold text-foreground">
                      {testLabel(lastScore.testType)}: {lastScore.score}/100
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Accuracy: {Math.round(lastScore.accuracy * 100)}%</p>
                  <p>
                    {lastScore.metricLabel}: {lastScore.metricValue}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="memory_recall" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
            <TabsTrigger value="memory_recall">Memory Recall</TabsTrigger>
            <TabsTrigger value="verbal_fluency">Verbal Fluency</TabsTrigger>
            <TabsTrigger value="attention_reaction">Attention & Reaction</TabsTrigger>
            <TabsTrigger value="sentence_repetition">Sentence Repeat</TabsTrigger>
          </TabsList>

          <TabsContent value="memory_recall">
            <MemoryRecallTest onComplete={handleMemoryComplete} />
          </TabsContent>

          <TabsContent value="verbal_fluency">
            <VerbalFluencyTest onComplete={handleVerbalComplete} />
          </TabsContent>

          <TabsContent value="attention_reaction">
            <AttentionReactionTest onComplete={handleAttentionComplete} />
          </TabsContent>

          <TabsContent value="sentence_repetition">
            <SentenceRepetitionTest onComplete={handleSentenceComplete} />
          </TabsContent>
        </Tabs>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Why voice-based cognitive testing helps</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Repeated voice assessments can reveal trends in processing speed, verbal output,
                  memory recall, and language precision. Consistent tracking helps you and your care team
                  monitor progress and adjust therapy based on objective performance over time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
