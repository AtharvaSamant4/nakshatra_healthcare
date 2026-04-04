"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import {
  Brain, Activity, ClipboardList, Users, Shield, TrendingUp,
  Dumbbell, Gamepad2, MessageSquare, FileText, ChevronRight,
  ArrowRight, Zap, Heart, Target, Star,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    desc: "Gemini AI analyses every session and generates personalised recovery plans, adaptive exercise intensity, and risk assessments in real time.",
    color: "bg-violet-500/10 text-violet-600",
  },
  {
    icon: Activity,
    title: "Recovery Tracking",
    desc: "Track ROM, form scores, session streaks, and composite recovery score combining physical performance with cognitive metrics.",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: Gamepad2,
    title: "Cognitive Games",
    desc: "Memory game, Reaction test, Stroop test, and Trail Making Test — clinically-inspired cognitive exercises built directly into rehab.",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: ClipboardList,
    title: "Smart Prescriptions",
    desc: "Doctors prescribe targeted exercises. Patients see only their plan. AI auto-adjusts reps and intensity based on performance trends.",
    color: "bg-orange-500/10 text-orange-600",
  },
  {
    icon: Shield,
    title: "Risk Alerts",
    desc: "Automated high-risk detection triggers instant alerts on the doctor dashboard. No patient falls through the cracks.",
    color: "bg-red-500/10 text-red-600",
  },
  {
    icon: FileText,
    title: "Medical-Grade Reports",
    desc: "One-click PDF reports with patient demographics, session tables, AI clinical summary, prescriptions, and doctor signature block.",
    color: "bg-teal-500/10 text-teal-600",
  },
]

const ROLES = [
  {
    icon: Users,
    role: "Doctor",
    color: "border-primary/30 bg-primary/5",
    iconColor: "bg-primary/10 text-primary",
    points: [
      "View all assigned patients at a glance",
      "See high-risk alerts instantly",
      "Deep-dive patient analytics & AI insights",
      "Download medical-grade PDF reports",
      "Chat with AI assistant about any patient",
    ],
    cta: "Doctor Login",
    email: "drsmoke@test.local",
  },
  {
    icon: Heart,
    role: "Patient",
    color: "border-emerald-400/30 bg-emerald-50/50 dark:bg-emerald-950/20",
    iconColor: "bg-emerald-500/10 text-emerald-600",
    points: [
      "Personalised AI recovery plan",
      "Exercise sessions with form feedback",
      "4 cognitive training games",
      "Real-time recovery score & streak",
      "AI therapist chatbot — 24/7",
    ],
    cta: "Patient Login",
    email: "aarav@gmail.com",
  },
  {
    icon: ClipboardList,
    role: "Receptionist",
    color: "border-amber-400/30 bg-amber-50/50 dark:bg-amber-950/20",
    iconColor: "bg-amber-500/10 text-amber-600",
    points: [
      "Register new patients",
      "Assign to treating doctors",
      "Manage patient status",
      "Quick patient lookup",
    ],
    cta: "Reception Login",
    email: "receptionist@test.local",
  },
]

const STATS = [
  { value: "6", label: "Demo Patients", icon: Users },
  { value: "4", label: "Cognitive Games", icon: Gamepad2 },
  { value: "AI", label: "Gemini Powered", icon: Brain },
  { value: "100%", label: "Role Secured", icon: Shield },
]

// ─── Animated counter ─────────────────────────────────────────────────────────

function useCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [activeRole, setActiveRole] = useState(0)

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">RehabAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background gradient blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Zap className="h-3.5 w-3.5" />
            AI-Powered Hospital Rehabilitation
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Smarter Recovery,<br />
            <span className="text-primary">Better Outcomes</span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
            RehabAI combines AI-driven exercise analysis, cognitive training games, and real-time
            risk monitoring — giving doctors and patients everything they need in one platform.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Start Demo <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-base font-medium text-foreground hover:bg-muted transition-colors"
            >
              See Features <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-2xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
                <div className="flex justify-center mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <s.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Everything your rehab team needs
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              From AI exercise coaching to cognitive games — all in one integrated platform.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className={cn("inline-flex h-11 w-11 items-center justify-center rounded-xl mb-4", f.color)}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role showcase ────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Built for every role
            </h2>
            <p className="mt-3 text-muted-foreground">
              Tailored dashboards and tools for doctors, patients, and reception staff.
            </p>
          </div>

          {/* Role tabs */}
          <div className="flex justify-center gap-2 mb-8">
            {ROLES.map((r, i) => (
              <button
                key={r.role}
                onClick={() => setActiveRole(i)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                  activeRole === i
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <r.icon className="h-4 w-4" />
                {r.role}
              </button>
            ))}
          </div>

          {/* Role card */}
          {ROLES.map((r, i) => (
            <div
              key={r.role}
              className={cn(
                "max-w-2xl mx-auto rounded-2xl border p-8 transition-all duration-300",
                r.color,
                activeRole === i ? "opacity-100 translate-y-0" : "hidden"
              )}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", r.iconColor)}>
                  <r.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{r.role} Dashboard</h3>
                  <p className="text-sm text-muted-foreground">{r.email}</p>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {r.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Star className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {r.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section className="py-20 bg-primary">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <TrendingUp className="h-10 w-10 text-primary-foreground/70 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
            Ready to see it in action?
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
            No setup needed. Log in with any demo credential and explore a fully seeded
            hospital rehab system powered by Gemini AI.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-primary hover:bg-white/90 transition-colors shadow-lg"
            >
              Launch Demo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-primary-foreground/70">
            <span>Doctor: drsmoke@test.local</span>
            <span>·</span>
            <span>Patient: aarav@gmail.com</span>
            <span>·</span>
            <span>Reception: receptionist@test.local</span>
            <span>·</span>
            <span className="italic">any password</span>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Dumbbell className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">RehabAI</span>
            <span>— Hospital Rehabilitation System</span>
          </div>
          <span>Built for Nakshatra Hackathon 2026</span>
        </div>
      </footer>

    </div>
  )
}
