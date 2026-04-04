"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/lib/user-context"
import { gameSessionsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Brain, Timer, Target, XCircle, CheckCircle, RotateCcw, Trophy, AlertTriangle } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "A" | "B"
type Phase = "intro" | "playing" | "results"

interface Node {
  id: string       // "1", "2", "A", "B", …
  x: number        // percent of canvas width
  y: number        // percent of canvas height
  order: number    // 0-indexed click order
}

interface Connection {
  from: Node
  to: Node
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_RADIUS = 26          // px
const MIN_DIST_PERCENT = 14     // minimum distance between nodes in % of min(w,h)
const THRESHOLD_A_MS = 30_000   // "fast" threshold for mode A
const THRESHOLD_B_MS = 60_000   // "fast" threshold for mode B
const ERROR_FLASH_MS = 600

// Build ordered sequence for mode A: 1..n
function buildSequenceA(count = 8): string[] {
  return Array.from({ length: count }, (_, i) => String(i + 1))
}

// Build sequence for mode B: 1,A,2,B,3,C,...
function buildSequenceB(): string[] {
  const nums = ["1", "2", "3", "4", "5"]
  const lets = ["A", "B", "C", "D", "E"]
  const seq: string[] = []
  const len = Math.min(nums.length, lets.length)
  for (let i = 0; i < len; i++) {
    seq.push(nums[i])
    seq.push(lets[i])
  }
  // trailing number if nums > lets
  if (nums.length > lets.length) seq.push(nums[len])
  return seq
}

// Place nodes without overlap using rejection sampling
function placeNodes(sequence: string[], canvasW: number, canvasH: number): Node[] {
  const nodes: Node[] = []
  const pad = 8   // percent padding from edge
  const minDist = MIN_DIST_PERCENT * Math.min(canvasW, canvasH) / 100

  for (let i = 0; i < sequence.length; i++) {
    let attempts = 0
    let x: number, y: number
    do {
      x = pad + Math.random() * (100 - pad * 2)
      y = pad + Math.random() * (100 - pad * 2)
      const px = (x / 100) * canvasW
      const py = (y / 100) * canvasH
      const ok = nodes.every((n) => {
        const nx = (n.x / 100) * canvasW
        const ny = (n.y / 100) * canvasH
        return Math.hypot(px - nx, py - ny) >= minDist
      })
      if (ok) break
    } while (++attempts < 500)

    nodes.push({ id: sequence[i], x, y, order: i })
  }
  return nodes
}

// ─── Insight helper ───────────────────────────────────────────────────────────

function getInsight(mode: Mode, errors: number, timeMs: number) {
  const threshold = mode === "A" ? THRESHOLD_A_MS : THRESHOLD_B_MS
  if (errors > 5) {
    return {
      text: "Low cognitive flexibility detected. Consider practising sequencing tasks regularly.",
      level: "warning" as const,
    }
  }
  if (timeMs < threshold) {
    return {
      text: "Excellent processing speed! Your sequencing ability is above average.",
      level: "success" as const,
    }
  }
  return {
    text: "Moderate performance. Consistent practice can improve your processing speed.",
    level: "neutral" as const,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrailMakingPage() {
  const { selectedUserId } = useUser()

  const [mode, setMode] = useState<Mode>("A")
  const [phase, setPhase] = useState<Phase>("intro")
  const [nodes, setNodes] = useState<Node[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [nextOrder, setNextOrder] = useState(0)
  const [flashNode, setFlashNode] = useState<{ id: string; correct: boolean } | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [errors, setErrors] = useState(0)
  const [totalClicks, setTotalClicks] = useState(0)
  const [saving, setSaving] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const savedRef = useRef(false)

  // ── Build nodes when entering play ────────────────────────────────────────
  const startGame = useCallback((selectedMode: Mode) => {
    setMode(selectedMode)
    const seq = selectedMode === "A" ? buildSequenceA() : buildSequenceB()
    const el = canvasRef.current
    const w = el?.clientWidth ?? 600
    const h = el?.clientHeight ?? 400
    setNodes(placeNodes(seq, w, h))
    setConnections([])
    setNextOrder(0)
    setElapsedMs(0)
    setErrors(0)
    setTotalClicks(0)
    setFlashNode(null)
    startTimeRef.current = null
    savedRef.current = false
    setPhase("playing")
  }, [])

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    // timer starts on first click (startTimeRef set in handleNodeClick)
    timerRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedMs(Date.now() - startTimeRef.current)
      }
    }, 100)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  // ── Node click handler ─────────────────────────────────────────────────────
  const handleNodeClick = useCallback((node: Node) => {
    if (phase !== "playing") return

    // Start timer on first click
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now()
    }

    setTotalClicks((c) => c + 1)
    const correct = node.order === nextOrder

    if (correct) {
      setFlashNode({ id: node.id, correct: true })
      setConnections((prev) => {
        if (nextOrder === 0) return prev
        const from = nodes[nextOrder - 1]
        const to = node
        return [...prev, { from, to }]
      })
      const newNext = nextOrder + 1
      setNextOrder(newNext)
      // Check completion
      if (newNext >= nodes.length) {
        if (timerRef.current) clearInterval(timerRef.current)
        const finalTime = Date.now() - (startTimeRef.current ?? Date.now())
        setElapsedMs(finalTime)
        setTimeout(() => setPhase("results"), 400)
      }
    } else {
      setErrors((e) => e + 1)
      setFlashNode({ id: node.id, correct: false })
    }

    setTimeout(() => setFlashNode(null), ERROR_FLASH_MS)
  }, [phase, nextOrder, nodes])

  // ── Save result ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "results" || savedRef.current || !selectedUserId) return
    savedRef.current = true
    const correctClicks = nodes.length
    const accuracy = totalClicks > 0 ? correctClicks / totalClicks : 1
    setSaving(true)
    gameSessionsApi
      .create({
        user_id: selectedUserId,
        game_type: "trail_making" as never, // extends the union at runtime
        score: Math.round(accuracy * 100),
        accuracy,
        duration_seconds: Math.round(elapsedMs / 1000),
        game_metadata: {
          mode,
          completion_time_ms: elapsedMs,
          total_errors: errors,
          accuracy,
        },
      })
      .catch(console.error)
      .finally(() => setSaving(false))
  }, [phase, selectedUserId, nodes.length, totalClicks, elapsedMs, errors, mode])

  // ── Format time ───────────────────────────────────────────────────────────
  const fmtTime = (ms: number) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    return m > 0 ? `${m}m ${s % 60}s` : `${s}.${String(ms % 1000).slice(0, 1)}s`
  }

  // ── Node color ─────────────────────────────────────────────────────────────
  function nodeColor(node: Node) {
    if (flashNode?.id === node.id) {
      return flashNode.correct
        ? "bg-green-500 border-green-600 text-white scale-110"
        : "bg-red-500 border-red-600 text-white scale-110"
    }
    if (node.order < nextOrder) {
      return "bg-primary/20 border-primary text-primary"
    }
    if (node.order === nextOrder) {
      return "bg-background border-primary text-foreground ring-2 ring-primary ring-offset-1"
    }
    return "bg-muted/60 border-border text-muted-foreground"
  }

  const accuracy = totalClicks > 0 ? Math.round((nodes.length / totalClicks) * 100) : 100
  const insight = phase === "results" ? getInsight(mode, errors, elapsedMs) : null

  // ── SVG lines ─────────────────────────────────────────────────────────────
  function renderLines() {
    if (!canvasRef.current) return null
    const w = canvasRef.current.clientWidth
    const h = canvasRef.current.clientHeight
    return (
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
      >
        {connections.map((conn, i) => (
          <line
            key={i}
            x1={`${conn.from.x}%`}
            y1={`${conn.from.y}%`}
            x2={`${conn.to.x}%`}
            y2={`${conn.to.y}%`}
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.7}
          />
        ))}
        {/* Live line: last connected → next node */}
        {nextOrder > 0 && nextOrder < nodes.length && connections.length > 0 && (
          <line
            x1={`${nodes[nextOrder - 1].x}%`}
            y1={`${nodes[nextOrder - 1].y}%`}
            x2={`${nodes[nextOrder].x}%`}
            y2={`${nodes[nextOrder].y}%`}
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray="6 4"
            opacity={0.35}
          />
        )}
      </svg>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Trail Making Test</h1>
              <p className="text-sm text-muted-foreground">Cognitive sequencing &amp; processing speed</p>
            </div>
          </div>
          {phase === "playing" && (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1.5 text-sm px-3 py-1">
                <Timer className="h-3.5 w-3.5" />
                {fmtTime(elapsedMs)}
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                Mode {mode}
              </Badge>
              <Button size="sm" variant="ghost" onClick={() => setPhase("intro")} className="gap-1.5 text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5" />
                Quit
              </Button>
            </div>
          )}
        </div>

        {/* ── INTRO ──────────────────────────────────────────────────────────── */}
        {phase === "intro" && (
          <div className="grid gap-5 sm:grid-cols-2">
            {(["A", "B"] as Mode[]).map((m) => (
              <Card
                key={m}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                onClick={() => startGame(m)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Mode {m}</CardTitle>
                    <Badge variant={m === "A" ? "secondary" : "default"}>
                      {m === "A" ? "Basic" : "Advanced"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {m === "A"
                      ? "Connect numbers in ascending order: 1 → 2 → 3 → 4 …"
                      : "Alternate between numbers and letters: 1 → A → 2 → B → 3 → C …"}
                  </p>
                  {/* Mini sequence preview */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(m === "A" ? ["1", "2", "3", "4", "5"] : ["1", "A", "2", "B", "3"]).map((label, i, arr) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border-2",
                          /[0-9]/.test(label)
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-violet-400/60 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                        )}>
                          {label}
                        </span>
                        {i < arr.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
                      </span>
                    ))}
                    <span className="text-muted-foreground text-xs">…</span>
                  </div>
                  <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" variant="outline" size="sm">
                    Start Mode {m}
                  </Button>
                </CardContent>
              </Card>
            ))}

            {/* How to play */}
            <Card className="sm:col-span-2 bg-muted/30">
              <CardContent className="p-4 flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">How to play</p>
                  <p>Click nodes in the correct order as fast as possible. Wrong clicks count as errors. The next node to click is highlighted with a ring.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── PLAYING ────────────────────────────────────────────────────────── */}
        {phase === "playing" && (
          <Card className="overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 w-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${nodes.length > 0 ? (nextOrder / nodes.length) * 100 : 0}%` }}
              />
            </div>
            <CardContent className="p-0">
              {/* Stats row */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 text-sm">
                <span className="text-muted-foreground">
                  Next: <span className="font-bold text-foreground">
                    {nodes[nextOrder]?.id ?? "✓"}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Errors: <span className={cn("font-bold", errors > 0 ? "text-red-500" : "text-foreground")}>{errors}</span>
                </span>
                <span className="text-muted-foreground">
                  {nextOrder}/{nodes.length} nodes
                </span>
              </div>

              {/* Canvas */}
              <div
                ref={canvasRef}
                className="relative w-full select-none"
                style={{ height: "420px" }}
              >
                {renderLines()}

                {nodes.map((node) => {
                  const isNumber = /^[0-9]+$/.test(node.id)
                  return (
                    <button
                      key={node.id}
                      onClick={() => handleNodeClick(node)}
                      style={{
                        position: "absolute",
                        left: `calc(${node.x}% - ${NODE_RADIUS}px)`,
                        top: `calc(${node.y}% - ${NODE_RADIUS}px)`,
                        width: NODE_RADIUS * 2,
                        height: NODE_RADIUS * 2,
                        zIndex: 2,
                      }}
                      className={cn(
                        "rounded-full border-2 font-bold text-sm flex items-center justify-center",
                        "transition-all duration-150 cursor-pointer focus:outline-none",
                        isNumber ? "" : "font-mono",
                        nodeColor(node)
                      )}
                    >
                      {node.id}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── RESULTS ────────────────────────────────────────────────────────── */}
        {phase === "results" && (
          <div className="space-y-4">
            {/* Score cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-5 pb-4 flex flex-col items-center gap-1 text-center">
                  <Timer className="h-6 w-6 text-primary mb-1" />
                  <p className="text-2xl font-bold text-foreground">{fmtTime(elapsedMs)}</p>
                  <p className="text-xs text-muted-foreground">Completion Time</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4 flex flex-col items-center gap-1 text-center">
                  <XCircle className={cn("h-6 w-6 mb-1", errors > 5 ? "text-red-500" : errors > 0 ? "text-amber-500" : "text-green-500")} />
                  <p className="text-2xl font-bold text-foreground">{errors}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4 flex flex-col items-center gap-1 text-center">
                  <CheckCircle className={cn("h-6 w-6 mb-1", accuracy >= 90 ? "text-green-500" : accuracy >= 70 ? "text-amber-500" : "text-red-500")} />
                  <p className="text-2xl font-bold text-foreground">{accuracy}%</p>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                </CardContent>
              </Card>
            </div>

            {/* AI Insight */}
            {insight && (
              <Card className={cn(
                "border",
                insight.level === "success" && "border-green-200 bg-green-50/50 dark:bg-green-950/20",
                insight.level === "warning" && "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20",
                insight.level === "neutral" && "border-primary/20 bg-primary/5",
              )}>
                <CardContent className="flex items-start gap-3 pt-4 pb-4">
                  {insight.level === "warning" ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  ) : insight.level === "success" ? (
                    <Trophy className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <Brain className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-0.5">AI Insight</p>
                    <p className="text-sm text-muted-foreground">{insight.text}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {saving && (
              <p className="text-xs text-muted-foreground text-center">Saving result…</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center flex-wrap">
              <Button onClick={() => startGame(mode)} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Play Again (Mode {mode})
              </Button>
              <Button variant="outline" onClick={() => startGame(mode === "A" ? "B" : "A")} className="gap-2">
                <Brain className="h-4 w-4" />
                Try Mode {mode === "A" ? "B" : "A"}
              </Button>
              <Button variant="ghost" onClick={() => setPhase("intro")}>
                Back to Menu
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
