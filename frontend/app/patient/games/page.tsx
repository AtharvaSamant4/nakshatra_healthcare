"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { MemoryGame } from "@/components/games/memory-game"
import { ReactionGame } from "@/components/games/reaction-game"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { gameSessionsApi, type GameSessionListItem } from "@/lib/api"
import { useApp } from "@/lib/app-context"
import { Brain, Zap, Trophy, Clock, Gamepad2, Layers, RotateCcw, CheckCircle, XCircle, Route } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    if (role !== "patient") {
      router.replace("/login")
      return
    }
  }, [role, router])

  useEffect(() => {
    if (!selectedUserId) return
    setStatsLoading(true)
    Promise.all([
      gameSessionsApi.list(selectedUserId, "memory", 50),
      gameSessionsApi.list(selectedUserId, "reaction", 50),
    ])
      .then(([mem, react]) => {
        setMemorySessions(mem.sessions)
        setReactionSessions(react.sessions)
      })
      .catch(console.error)
      .finally(() => setStatsLoading(false))
  }, [selectedUserId])

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
      ? Math.min(...memorySessions.map((s) => s.duration_seconds ?? Infinity).filter((v) => v !== Infinity))
      : null
  const bestReactionScore =
    reactionSessions.length > 0 ? Math.max(...reactionSessions.map((s) => s.score)) : null

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
          <p className="mt-1 text-muted-foreground">Keep your mind sharp with cognitive exercises</p>
        </div>

        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Memory Games</p>
                  <p className="text-lg font-semibold text-foreground">{statsLoading ? "—" : memorySessions.length}</p>
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
                  <p className="text-lg font-semibold text-foreground">{statsLoading ? "—" : reactionSessions.length}</p>
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
                    {statsLoading ? "—" : bestMemoryDuration != null ? formatDuration(bestMemoryDuration) : "N/A"}
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
                    {statsLoading ? "—" : bestReactionScore != null ? `${bestReactionScore} pts` : "N/A"}
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
                    <span>Time: {Math.floor((lastScore.time || 0) / 60)}:{((lastScore.time || 0) % 60).toString().padStart(2, "0")} | Moves: {lastScore.moves}</span>
                  ) : (
                    <span>Avg: {lastScore.avgTime}ms | Rounds: {lastScore.rounds}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All 4 game tabs */}
        <Tabs defaultValue="memory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="memory" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Memory</span>
              <span className="sm:hidden">Mem</span>
            </TabsTrigger>
            <TabsTrigger value="reaction" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Reaction</span>
              <span className="sm:hidden">React</span>
            </TabsTrigger>
            <TabsTrigger value="stroop" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Layers className="h-4 w-4" />
              <span>Stroop</span>
            </TabsTrigger>
            <TabsTrigger value="trail" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Route className="h-4 w-4" />
              <span className="hidden sm:inline">Trail Making</span>
              <span className="sm:hidden">Trail</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="memory">
            <MemoryGame onComplete={handleMemoryComplete} />
          </TabsContent>

          <TabsContent value="reaction">
            <ReactionGame onComplete={handleReactionComplete} />
          </TabsContent>

          <TabsContent value="stroop">
            <StroopGameEmbed selectedUserId={selectedUserId} />
          </TabsContent>

          <TabsContent value="trail">
            <TrailMakingEmbed selectedUserId={selectedUserId} />
          </TabsContent>
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
                  Cognitive exercises like memory games, reaction tests, Stroop tasks, and trail making
                  strengthen neural pathways, improve focus, and enhance hand-eye coordination — supporting
                  your overall rehabilitation progress.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

// ─── Stroop Game ──────────────────────────────────────────────────────────────

const STROOP_COLORS = ["Red", "Blue", "Green", "Yellow"] as const
type StroopColor = typeof STROOP_COLORS[number]
const COLOR_STYLES: Record<StroopColor, string> = {
  Red:    "text-red-500",
  Blue:   "text-blue-500",
  Green:  "text-green-500",
  Yellow: "text-yellow-500",
}
const BTN_STYLES: Record<StroopColor, string> = {
  Red:    "bg-red-500 hover:bg-red-600 text-white",
  Blue:   "bg-blue-500 hover:bg-blue-600 text-white",
  Green:  "bg-green-500 hover:bg-green-600 text-white",
  Yellow: "bg-yellow-400 hover:bg-yellow-500 text-black",
}
const TOTAL = 10

function shuffle<T>(a: T[]): T[] { return [...a].sort(() => Math.random() - 0.5) }
function rnd<T>(a: readonly T[]): T { return a[Math.floor(Math.random() * a.length)] }
function mkRound() {
  const color = rnd(STROOP_COLORS)
  const word  = Math.random() < 0.7 ? rnd(STROOP_COLORS.filter(c => c !== color)) : color
  return { word, color, opts: shuffle([...STROOP_COLORS]) }
}

function StroopGameEmbed({ selectedUserId }: { selectedUserId: string | null }) {
  const [phase, setPhase]     = useState<"intro"|"playing"|"feedback"|"results">("intro")
  const [idx,   setIdx]       = useState(0)
  const [round, setRound]     = useState(mkRound)
  const [results, setResults] = useState<{ok:boolean; rt:number}[]>([])
  const [last,  setLast]      = useState<boolean|null>(null)
  const [tLeft, setTLeft]     = useState(3000)
  const [saving, setSaving]   = useState(false)
  const startRef  = useRef<number>(0)
  const timerRef  = useRef<ReturnType<typeof setInterval>|null>(null)
  const doneRef   = useRef(false)
  const answeredRef = useRef(false)

  const clearT = useCallback(() => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }, [])
  useEffect(() => () => clearT(), [clearT])

  const record = useCallback((ok: boolean, rt: number) => {
    if (doneRef.current) return
    doneRef.current = true
    clearT()
    setLast(ok)
    setPhase("feedback")
    setResults(prev => {
      const next = [...prev, { ok, rt }]
      setTimeout(() => {
        if (idx + 1 >= TOTAL) {
          setPhase("results")
          saveStroop(next)
        } else {
          setIdx(i => i + 1)
          setRound(mkRound())
          setLast(null)
          setPhase("playing")
        }
      }, 500)
      return next
    })
  }, [idx, clearT]) // eslint-disable-line

  useEffect(() => {
    if (phase !== "playing") return
    setTLeft(3000)
    startRef.current = Date.now()
    doneRef.current  = false
    answeredRef.current = false
    timerRef.current = setInterval(() => {
      setTLeft(p => {
        if (p <= 100) { clearT(); record(false, -1); return 0 }
        return p - 100
      })
    }, 100)
  }, [phase, idx]) // eslint-disable-line

  async function saveStroop(res: {ok:boolean;rt:number}[]) {
    if (!selectedUserId) return
    setSaving(true)
    const correct = res.filter(r => r.ok).length
    const validRT = res.filter(r => r.rt > 0).map(r => r.rt)
    const avgRT   = validRT.length ? Math.round(validRT.reduce((a,b)=>a+b,0)/validRT.length) : 0
    try {
      await gameSessionsApi.create({
        user_id: selectedUserId, game_type: "stroop",
        score: Math.round(correct/TOTAL*100), accuracy: correct/TOTAL,
        avg_reaction_ms: avgRT, duration_seconds: 30,
        game_metadata: { correct, wrong: TOTAL-correct, avg_reaction_ms: avgRT },
      })
    } catch(e) { console.error(e) } finally { setSaving(false) }
  }

  function startGame() { setResults([]); setIdx(0); setRound(mkRound()); setLast(null); setPhase("playing") }

  const correct = results.filter(r=>r.ok).length
  const accuracy = results.length ? correct/results.length : 0
  const validRT  = results.filter(r=>r.rt>0).map(r=>r.rt)
  const avgRT    = validRT.length ? Math.round(validRT.reduce((a,b)=>a+b,0)/validRT.length) : 0
  const interf   = results.length ? (results.length-correct)/results.length : 0
  const insight  = interf > 0.4
    ? "High cognitive interference detected. Practice focus exercises."
    : accuracy > 0.8
    ? "Strong cognitive control. Excellent inhibition ability."
    : "Moderate attention performance. Consistent training will help."

  return (
    <Card>
      <CardContent className="p-6">
        {phase === "intro" && (
          <div className="flex flex-col items-center gap-5 text-center py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Layers className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Stroop Cognitive Test</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Click the <strong>ink colour</strong> of the word — not the word itself. 10 rounds, 3 seconds each.
              </p>
            </div>
            <button onClick={startGame} className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
              Start Test
            </button>
          </div>
        )}

        {(phase === "playing" || phase === "feedback") && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">Round {idx+1}/{TOTAL}</span>
              <span className="text-sm font-medium text-foreground">{Math.ceil(tLeft/1000)}s</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all duration-100" style={{ width: `${(tLeft/3000)*100}%` }} />
            </div>
            <div className="py-8">
              <span className={cn("text-6xl font-black tracking-tight select-none", COLOR_STYLES[round.color])}>
                {round.word}
              </span>
            </div>
            {phase === "feedback" && (
              <div className={cn("flex items-center gap-2 text-lg font-bold", last ? "text-green-500" : "text-red-500")}>
                {last ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                {last ? "Correct!" : "Wrong!"}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 w-full sm:grid-cols-4">
              {round.opts.map(opt => (
                <button key={opt} disabled={phase === "feedback"}
                  onClick={() => {
                    if (answeredRef.current) return
                    answeredRef.current = true
                    record(opt === round.color, Date.now() - startRef.current)
                  }}
                  className={cn("py-3 px-4 rounded-xl font-bold text-sm transition-all", BTN_STYLES[opt], phase === "feedback" && "opacity-50 cursor-not-allowed")}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "results" && (
          <div className="flex flex-col items-center gap-5 py-2">
            <div className="grid grid-cols-3 gap-4 w-full">
              <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-muted/30 p-3 text-center">
                <span className="text-2xl">🎯</span>
                <span className="font-bold text-foreground text-lg">{Math.round(accuracy*100)}%</span>
                <span className="text-xs text-muted-foreground">Accuracy</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-muted/30 p-3 text-center">
                <span className="text-2xl">⚡</span>
                <span className="font-bold text-foreground text-lg">{avgRT}ms</span>
                <span className="text-xs text-muted-foreground">Avg Reaction</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-muted/30 p-3 text-center">
                <span className="text-2xl">✓</span>
                <span className="font-bold text-foreground text-lg">{correct}/{TOTAL}</span>
                <span className="text-xs text-muted-foreground">Correct</span>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap justify-center">
              {results.map((r,i) => (
                <div key={i} className={cn("flex flex-col items-center gap-0.5 w-8 p-1 rounded text-xs font-bold", r.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                  {r.ok?"✓":"✗"}
                  <span className="text-[9px] text-muted-foreground">{r.rt>0?r.rt:"–"}</span>
                </div>
              ))}
            </div>
            <div className={cn("w-full rounded-xl border-l-4 p-4 flex items-start gap-3",
              interf>0.4?"border-l-yellow-400 bg-yellow-50 dark:bg-yellow-950/20":accuracy>0.8?"border-l-green-500 bg-green-50 dark:bg-green-950/20":"border-l-blue-400 bg-blue-50 dark:bg-blue-950/20")}>
              <Brain className={cn("h-5 w-5 mt-0.5 shrink-0", interf>0.4?"text-yellow-600":accuracy>0.8?"text-green-600":"text-blue-600")} />
              <div>
                <p className="text-sm font-semibold text-foreground mb-0.5">AI Interpretation</p>
                <p className="text-sm text-muted-foreground">{insight}</p>
              </div>
            </div>
            {saving && <p className="text-xs text-muted-foreground">Saving results…</p>}
            <button onClick={startGame} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
              <RotateCcw className="h-4 w-4" /> Try Again
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Trail Making Embed ───────────────────────────────────────────────────────

const TMT_NODE_R = 26
const TMT_MIN_DIST = 14
const TMT_ERROR_FLASH = 600

function buildTmtSequence(mode: "A" | "B"): string[] {
  if (mode === "A") return Array.from({ length: 8 }, (_, i) => String(i + 1))
  const nums = ["1","2","3","4","5"]
  const lets = ["A","B","C","D","E"]
  const seq: string[] = []
  for (let i = 0; i < 5; i++) { seq.push(nums[i]); seq.push(lets[i]) }
  return seq
}

function placeTmtNodes(seq: string[], w: number, h: number) {
  const nodes: { id: string; x: number; y: number; order: number }[] = []
  const pad = 8
  const minD = TMT_MIN_DIST * Math.min(w, h) / 100
  for (let i = 0; i < seq.length; i++) {
    let x = 0, y = 0, att = 0
    do {
      x = pad + Math.random() * (100 - pad * 2)
      y = pad + Math.random() * (100 - pad * 2)
      const px = x / 100 * w, py = y / 100 * h
      if (nodes.every(n => Math.hypot(n.x/100*w - px, n.y/100*h - py) >= minD)) break
    } while (++att < 500)
    nodes.push({ id: seq[i], x, y, order: i })
  }
  return nodes
}

function TrailMakingEmbed({ selectedUserId }: { selectedUserId: string | null }) {
  type TmtNode = { id: string; x: number; y: number; order: number }
  type TmtConn = { from: TmtNode; to: TmtNode }
  type TmtPhase = "intro" | "playing" | "results"

  const [tmtPhase, setTmtPhase] = useState<TmtPhase>("intro")
  const [tmtMode, setTmtMode]   = useState<"A"|"B">("A")
  const [tmtNodes, setTmtNodes] = useState<TmtNode[]>([])
  const [tmtConns, setTmtConns] = useState<TmtConn[]>([])
  const [nextOrd,  setNextOrd]  = useState(0)
  const [flash,    setFlash]    = useState<{id:string; ok:boolean} | null>(null)
  const [elapsed,  setElapsed]  = useState(0)
  const [tmtErrors,setTmtErrors]= useState(0)
  const [totalClk, setTotalClk] = useState(0)
  const [saving,   setSaving]   = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const startTRef = useRef<number | null>(null)
  const tmtTimer  = useRef<ReturnType<typeof setInterval> | null>(null)
  const savedRef  = useRef(false)

  function startTmt(mode: "A"|"B") {
    setTmtMode(mode)
    const seq = buildTmtSequence(mode)
    const w = canvasRef.current?.clientWidth ?? 600
    const h = canvasRef.current?.clientHeight ?? 380
    setTmtNodes(placeTmtNodes(seq, w, h))
    setTmtConns([]); setNextOrd(0); setElapsed(0); setTmtErrors(0); setTotalClk(0); setFlash(null)
    startTRef.current = null; savedRef.current = false
    setTmtPhase("playing")
  }

  useEffect(() => {
    if (tmtPhase !== "playing") { if (tmtTimer.current) clearInterval(tmtTimer.current); return }
    tmtTimer.current = setInterval(() => {
      if (startTRef.current !== null) setElapsed(Date.now() - startTRef.current)
    }, 100)
    return () => { if (tmtTimer.current) clearInterval(tmtTimer.current) }
  }, [tmtPhase])

  function handleTmtClick(node: TmtNode) {
    if (tmtPhase !== "playing") return
    if (startTRef.current === null) startTRef.current = Date.now()
    setTotalClk(c => c + 1)
    const ok = node.order === nextOrd
    if (ok) {
      setFlash({ id: node.id, ok: true })
      if (nextOrd > 0) setTmtConns(prev => [...prev, { from: tmtNodes[nextOrd - 1], to: node }])
      const nn = nextOrd + 1
      setNextOrd(nn)
      if (nn >= tmtNodes.length) {
        if (tmtTimer.current) clearInterval(tmtTimer.current)
        const ft = Date.now() - (startTRef.current ?? Date.now())
        setElapsed(ft)
        setTimeout(() => setTmtPhase("results"), 400)
      }
    } else {
      setTmtErrors(e => e + 1)
      setFlash({ id: node.id, ok: false })
    }
    setTimeout(() => setFlash(null), TMT_ERROR_FLASH)
  }

  useEffect(() => {
    if (tmtPhase !== "results" || savedRef.current || !selectedUserId) return
    savedRef.current = true
    const acc = totalClk > 0 ? tmtNodes.length / totalClk : 1
    setSaving(true)
    gameSessionsApi.create({
      user_id: selectedUserId,
      game_type: "trail_making" as never,
      score: Math.round(acc * 100),
      accuracy: acc,
      duration_seconds: Math.round(elapsed / 1000),
      game_metadata: { mode: tmtMode, completion_time_ms: elapsed, total_errors: tmtErrors, accuracy: acc },
    }).catch(console.error).finally(() => setSaving(false))
  }, [tmtPhase]) // eslint-disable-line

  const fmtT = (ms: number) => { const s = Math.floor(ms/1000); const m = Math.floor(s/60); return m > 0 ? `${m}m ${s%60}s` : `${s}.${String(ms%1000).slice(0,1)}s` }
  const tmtAcc = totalClk > 0 ? Math.round(tmtNodes.length / totalClk * 100) : 100
  const threshold = tmtMode === "A" ? 30000 : 60000
  const tmtInsight = tmtErrors > 5
    ? "Low cognitive flexibility detected. Try practising sequencing tasks daily."
    : elapsed < threshold
    ? "Excellent processing speed! Your sequencing ability is above average."
    : "Moderate performance. Consistent training will improve your processing speed."

  function nodeStyle(n: TmtNode) {
    if (flash?.id === n.id) return flash.ok ? "bg-green-500 border-green-600 text-white scale-110" : "bg-red-500 border-red-600 text-white scale-110"
    if (n.order < nextOrd) return "bg-primary/20 border-primary text-primary"
    if (n.order === nextOrd) return "bg-background border-primary text-foreground ring-2 ring-primary ring-offset-1"
    return "bg-muted/60 border-border text-muted-foreground"
  }

  return (
    <Card>
      <CardContent className="p-6">

        {tmtPhase === "intro" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 text-center pb-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Route className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Trail Making Test</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Click nodes in the correct sequence as fast as possible. Tests cognitive sequencing &amp; processing speed.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["A","B"] as const).map(m => (
                <button key={m} onClick={() => startTmt(m)}
                  className="flex flex-col items-start gap-2 rounded-xl border-2 border-border hover:border-primary/60 bg-muted/30 hover:bg-primary/5 p-4 text-left transition-all">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-base">Mode {m}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", m === "A" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
                      {m === "A" ? "Basic" : "Advanced"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {m === "A" ? "Numbers only: 1 → 2 → 3 → 4 …" : "Alternating: 1 → A → 2 → B → 3 → C …"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {tmtPhase === "playing" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Next: <span className="font-bold text-foreground">{tmtNodes[nextOrd]?.id ?? "✓"}</span></span>
              <span className={cn("font-semibold", tmtErrors > 0 ? "text-red-500" : "text-foreground")}>Errors: {tmtErrors}</span>
              <span className="font-mono text-muted-foreground">{fmtT(elapsed)}</span>
              <button onClick={() => setTmtPhase("intro")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <RotateCcw className="h-3 w-3" /> Quit
              </button>
            </div>
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${tmtNodes.length > 0 ? nextOrd/tmtNodes.length*100 : 0}%` }} />
            </div>
            <div ref={canvasRef} className="relative w-full rounded-xl border border-border bg-muted/10 select-none" style={{ height: 380 }}>
              <svg className="pointer-events-none absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                {tmtConns.map((c, i) => (
                  <line key={i} x1={`${c.from.x}%`} y1={`${c.from.y}%`} x2={`${c.to.x}%`} y2={`${c.to.y}%`}
                    stroke="hsl(var(--primary))" strokeWidth={2.5} strokeLinecap="round" opacity={0.65} />
                ))}
                {nextOrd > 0 && nextOrd < tmtNodes.length && (
                  <line x1={`${tmtNodes[nextOrd-1].x}%`} y1={`${tmtNodes[nextOrd-1].y}%`}
                    x2={`${tmtNodes[nextOrd].x}%`} y2={`${tmtNodes[nextOrd].y}%`}
                    stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.3} />
                )}
              </svg>
              {tmtNodes.map(n => (
                <button key={n.id} onClick={() => handleTmtClick(n)}
                  style={{ position:"absolute", left:`calc(${n.x}% - ${TMT_NODE_R}px)`, top:`calc(${n.y}% - ${TMT_NODE_R}px)`, width:TMT_NODE_R*2, height:TMT_NODE_R*2, zIndex:2 }}
                  className={cn("rounded-full border-2 font-bold text-sm flex items-center justify-center transition-all duration-150 focus:outline-none", nodeStyle(n))}>
                  {n.id}
                </button>
              ))}
            </div>
          </div>
        )}

        {tmtPhase === "results" && (
          <div className="flex flex-col items-center gap-5 py-2">
            <div className="grid grid-cols-3 gap-4 w-full">
              {[
                { label: "Time", value: fmtT(elapsed), icon: "⏱" },
                { label: "Errors", value: String(tmtErrors), icon: tmtErrors > 5 ? "⚠" : "✓" },
                { label: "Accuracy", value: `${tmtAcc}%`, icon: "🎯" },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-muted/30 p-3 text-center">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="font-bold text-foreground text-lg">{s.value}</span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
            <div className={cn("w-full rounded-xl border-l-4 p-4 flex items-start gap-3",
              tmtErrors > 5 ? "border-l-yellow-400 bg-yellow-50 dark:bg-yellow-950/20"
              : elapsed < threshold ? "border-l-green-500 bg-green-50 dark:bg-green-950/20"
              : "border-l-blue-400 bg-blue-50 dark:bg-blue-950/20")}>
              <Brain className={cn("h-5 w-5 mt-0.5 shrink-0", tmtErrors > 5 ? "text-yellow-600" : elapsed < threshold ? "text-green-600" : "text-blue-600")} />
              <div>
                <p className="text-sm font-semibold text-foreground mb-0.5">AI Insight</p>
                <p className="text-sm text-muted-foreground">{tmtInsight}</p>
              </div>
            </div>
            {saving && <p className="text-xs text-muted-foreground">Saving results…</p>}
            <div className="flex gap-3 flex-wrap justify-center">
              <button onClick={() => startTmt(tmtMode)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-sm">
                <RotateCcw className="h-4 w-4" /> Play Again
              </button>
              <button onClick={() => startTmt(tmtMode === "A" ? "B" : "A")} className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border bg-background font-semibold hover:bg-muted transition-colors text-sm">
                Try Mode {tmtMode === "A" ? "B" : "A"}
              </button>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
