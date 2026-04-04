"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/components/app-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RecentSessions } from "@/components/dashboard/recent-sessions"
import {
  patientsApi,
  prescriptionsApi,
  exercisesApi,
  sessionsApi,
  aiApi,
  progressApi,
  gameSessionsApi,
  type Patient,
  type Prescription,
  type Exercise,
  type SessionListItem,
  type PatientReport,
  type ProgressResponse,
  type GameSessionListItem,
} from "@/lib/api"
import { useApp } from "@/lib/app-context"
import { Download, ArrowLeft, User, ClipboardList, Dumbbell, MessageSquare, Plus, Save, FileText, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, BarChart2, Target, Flame, Brain, Zap, Activity } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from "recharts"
import { DoctorChat } from "@/components/ai/doctor-chat"

const STATUS_COLORS: Record<string, string> = {
  registered: "bg-muted text-muted-foreground",
  evaluated: "bg-blue-100 text-blue-700",
  in_treatment: "bg-green-100 text-green-700",
  discharged: "bg-gray-100 text-gray-500",
}

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>
}) {
  const { patientId } = use(params)
  const { identity, role } = useApp()
  const router = useRouter()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<PatientReport[]>([])
  const [generatingReport, setGeneratingReport] = useState(false)
  const [progress, setProgress] = useState<ProgressResponse | null>(null)
  const [gameSessions, setGameSessions] = useState<GameSessionListItem[]>([])

  // Profile edit state
  const [profileForm, setProfileForm] = useState({
    diagnosis: "",
    injury_type: "",
    severity: "",
    status: "",
    condition_notes: "",
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // Prescription form state
  const [rxForm, setRxForm] = useState({
    exercise_id: "",
    game_type: "",
    prescribeType: "exercise" as "exercise" | "game",
    target_reps: "",
    frequency: "daily",
    priority: "normal",
    notes: "",
  })
  const [addingRx, setAddingRx] = useState(false)
  const [showRxForm, setShowRxForm] = useState(false)

  const downloadPdf = async (reportId: string, index: number) => {
    if (!patient) return
    try {
      const jspdfModule = await import('jspdf')
      const jsPDF = jspdfModule.default || jspdfModule.jsPDF
      const doc = new jsPDF('p', 'mm', 'a4')

      const W = 210   // A4 width mm
      const ML = 15   // margin left
      const MR = 15   // margin right
      const TW = W - ML - MR  // text width
      let y = 0

      // ── colour palette ──────────────────────────────────────────────────────
      const PRIMARY  = [14,  90,  90]   // dark teal  #0e5a5a
      const ACCENT   = [0, 150, 136]    // teal       #009688
      const LIGHT_BG = [240, 248, 248]  // pale teal  #f0f8f8
      const BORDER   = [180, 220, 218]
      const DARK     = [30,  30,  30]
      const MID      = [80,  80,  80]
      const MUTED    = [120, 120, 120]
      const WHITE    = [255, 255, 255]
      const RED_BG   = [255, 235, 235]
      const RED_FG   = [180,  30,  30]
      const GREEN_BG = [235, 250, 240]
      const GREEN_FG = [20, 130,  70]
      const YEL_BG   = [255, 250, 220]
      const YEL_FG   = [140, 100,   0]

      const setFill  = (c: number[]) => doc.setFillColor(c[0], c[1], c[2])
      const setDraw  = (c: number[]) => doc.setDrawColor(c[0], c[1], c[2])
      const setColor = (c: number[]) => doc.setTextColor(c[0], c[1], c[2])

      // ── helpers ─────────────────────────────────────────────────────────────
      const bold   = (sz: number) => { doc.setFont('helvetica','bold');   doc.setFontSize(sz) }
      const normal = (sz: number) => { doc.setFont('helvetica','normal'); doc.setFontSize(sz) }
      const italic = (sz: number) => { doc.setFont('helvetica','italic'); doc.setFontSize(sz) }

      const hline = (yy: number, c = BORDER, lw = 0.3) => {
        setDraw(c); doc.setLineWidth(lw)
        doc.line(ML, yy, W - MR, yy)
      }
      const checkPage = (need: number) => {
        if (y + need > 275) { doc.addPage(); y = 18 }
      }

      const labelValue = (label: string, value: string, x: number, yy: number, colW = 85) => {
        bold(7.5); setColor(MUTED); doc.text(label.toUpperCase(), x, yy)
        normal(9); setColor(DARK);  doc.text(value || '—', x, yy + 4.5)
      }

      const sectionHeader = (title: string) => {
        checkPage(12)
        setFill(PRIMARY); doc.setLineWidth(0)
        doc.rect(ML, y, TW, 7, 'F')
        bold(9); setColor(WHITE)
        doc.text(title, ML + 3, y + 5)
        y += 11
      }

      const pillBadge = (text: string, bgCol: number[], fgCol: number[], x: number, yy: number) => {
        bold(7.5); setColor(fgCol)
        const tw = doc.getTextWidth(text)
        setFill(bgCol); setDraw(bgCol); doc.setLineWidth(0.1)
        doc.roundedRect(x - 2, yy - 4, tw + 4, 5.5, 1, 1, 'FD')
        doc.text(text, x, yy)
      }

      // ════════════════════════════════════════════════════════════════════════
      // PAGE HEADER BAND
      // ════════════════════════════════════════════════════════════════════════
      y = 0
      setFill(PRIMARY); doc.rect(0, 0, W, 28, 'F')

      // Hospital name
      bold(15); setColor(WHITE)
      doc.text('NAKSHATRA REHABILITATION CENTER', ML, 11)
      italic(8); setColor([200,240,238])
      doc.text('Advanced AI-Assisted Physiotherapy & Cognitive Rehabilitation', ML, 16.5)

      // Report type box (right)
      setFill(ACCENT); doc.rect(W - 68, 2, 54, 24, 'F')
      bold(8.5); setColor(WHITE)
      doc.text('PATIENT PROGRESS REPORT', W - 66, 9)
      doc.text('CONFIDENTIAL — MEDICAL RECORD', W - 66, 14)
      normal(7.5); setColor([200,240,238])

      const rpt = reports[index] || reports[0]
      const rptDate = rpt?.created_at ? new Date(rpt.created_at).toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'}) : new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})
      doc.text(`Date: ${rptDate}`, W - 66, 19)
      doc.text(`Report ID: RPT-${(rpt?.id ?? 'N/A').slice(-8).toUpperCase()}`, W - 66, 23.5)

      y = 33

      // ════════════════════════════════════════════════════════════════════════
      // PATIENT DEMOGRAPHICS
      // ════════════════════════════════════════════════════════════════════════
      setFill(LIGHT_BG); setDraw(BORDER); doc.setLineWidth(0.3)
      doc.rect(ML, y, TW, 34, 'FD')

      bold(9); setColor(PRIMARY)
      doc.text('PATIENT INFORMATION', ML + 3, y + 5.5)
      hline(y + 7, BORDER, 0.2)

      const p = patient
      const col1x = ML + 4
      const col2x = ML + 60
      const col3x = ML + 120

      labelValue('Patient Name',    p.name ?? '—',                     col1x, y + 13)
      labelValue('Patient ID',      (p.id ?? '—').slice(-12).toUpperCase(), col2x, y + 13)
      labelValue('Age',             p.age ? `${p.age} years` : '—',   col3x, y + 13)

      labelValue('Diagnosis',       p.diagnosis ?? 'Not recorded',     col1x, y + 23)
      labelValue('Injury Type',     p.injury_type ?? 'Not specified',  col2x, y + 23)
      labelValue('Severity',        p.severity ?? 'Not specified',     col3x, y + 23)

      y += 38

      // status + emergency badges inline
      const statusLabel = (p.status ?? 'registered').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())
      const statusBg = p.status === 'in_treatment' ? GREEN_BG : p.status === 'discharged' ? [235,235,235] : LIGHT_BG
      const statusFg = p.status === 'in_treatment' ? GREEN_FG : p.status === 'discharged' ? MUTED : PRIMARY
      pillBadge(`Status: ${statusLabel}`, statusBg, statusFg, col1x, y + 1)
      if (p.emergency) pillBadge('⚠ EMERGENCY', RED_BG, RED_FG, col1x + 55, y + 1)
      if (p.phone)    { normal(8); setColor(MID); doc.text(`Phone: ${p.phone}`, col2x, y + 1) }
      if (p.email)    { normal(8); setColor(MID); doc.text(`Email: ${p.email}`, col3x, y + 1) }

      y += 8
      if (p.condition_notes) {
        bold(7.5); setColor(MUTED); doc.text('CLINICAL NOTES', col1x, y)
        y += 4.5
        normal(8.5); setColor(DARK)
        const noteLines = doc.splitTextToSize(p.condition_notes, TW - 6)
        noteLines.forEach((line: string) => { doc.text(line, col1x, y); y += 4.5 })
      }

      y += 5

      // ════════════════════════════════════════════════════════════════════════
      // TREATING PHYSICIAN
      // ════════════════════════════════════════════════════════════════════════
      if (identity) {
        setFill(LIGHT_BG); setDraw(BORDER); doc.setLineWidth(0.3)
        doc.rect(ML, y, TW, 14, 'FD')
        bold(9); setColor(PRIMARY); doc.text('TREATING PHYSICIAN', ML + 3, y + 5.5)
        hline(y + 7, BORDER, 0.2)
        labelValue('Doctor', identity.name ?? '—',   col1x, y + 12)
        labelValue('Department', 'Physiotherapy & Rehabilitation', col2x, y + 12)
        y += 18
      }

      // ════════════════════════════════════════════════════════════════════════
      // AI REPORT — main report content
      // ════════════════════════════════════════════════════════════════════════
      const rj = rpt?.report || {}

      sectionHeader('AI CLINICAL SUMMARY')

      // Risk + Trend badges row
      const trendLabel = rj.progress_trend ?? 'stable'
      const trendBg = trendLabel==='improving'? GREEN_BG : trendLabel==='declining'? RED_BG : YEL_BG
      const trendFg = trendLabel==='improving'? GREEN_FG : trendLabel==='declining'? RED_FG : YEL_FG
      pillBadge(`Trend: ${trendLabel.toUpperCase()}`, trendBg, trendFg, ML, y)

      const riskLabel = (rj.risk_level ?? 'low').toUpperCase()
      const riskBg = rj.risk_level==='high'? RED_BG : rj.risk_level==='medium'? YEL_BG : GREEN_BG
      const riskFg = rj.risk_level==='high'? RED_FG : rj.risk_level==='medium'? YEL_FG : GREEN_FG
      pillBadge(`Risk Level: ${riskLabel}`, riskBg, riskFg, ML + 48, y)

      // Weekly metrics badges if available
      if (typeof rj.improvement === 'number') {
        const impSign = rj.improvement >= 0 ? '+' : ''
        pillBadge(`Improvement: ${impSign}${rj.improvement.toFixed(1)}%`, rj.improvement>=0 ? GREEN_BG : RED_BG, rj.improvement>=0 ? GREEN_FG : RED_FG, ML + 98, y)
      }
      if (typeof rj.consistency === 'number') {
        pillBadge(`Consistency: ${Math.round(rj.consistency*100)}%`, LIGHT_BG, PRIMARY, ML + 148, y)
      }
      y += 8

      if (rj.summary) {
        checkPage(20)
        bold(8.5); setColor(MUTED); doc.text('SUMMARY', ML, y); y += 4.5
        normal(9.5); setColor(DARK)
        const sumLines = doc.splitTextToSize(rj.summary, TW)
        sumLines.forEach((l: string) => { checkPage(5); doc.text(l, ML, y); y += 5 })
        y += 3
      }

      // Form analysis + cognitive analysis
      if (rj.form_analysis || rj.cognitive_analysis) {
        checkPage(24)
        setFill(LIGHT_BG); setDraw(BORDER); doc.setLineWidth(0.2)
        const boxH = 22
        doc.rect(ML, y, TW / 2 - 2, boxH, 'FD')
        doc.rect(ML + TW / 2 + 2, y, TW / 2 - 2, boxH, 'FD')

        bold(7.5); setColor(PRIMARY)
        doc.text('PHYSICAL FORM ANALYSIS', ML + 2, y + 5)
        normal(8.5); setColor(DARK)
        const faLines = doc.splitTextToSize(rj.form_analysis ?? '—', TW / 2 - 6)
        faLines.slice(0,3).forEach((l: string, li: number) => doc.text(l, ML + 2, y + 10 + li * 4))

        bold(7.5); setColor(PRIMARY)
        doc.text('COGNITIVE ANALYSIS', ML + TW / 2 + 4, y + 5)
        normal(8.5); setColor(DARK)
        const caLines = doc.splitTextToSize(rj.cognitive_analysis ?? '—', TW / 2 - 6)
        caLines.slice(0,3).forEach((l: string, li: number) => doc.text(l, ML + TW / 2 + 4, y + 10 + li * 4))

        y += boxH + 5
      }

      // ── Key Issues ──────────────────────────────────────────────────────────
      if (rj.key_issues?.length) {
        checkPage(10 + rj.key_issues.length * 6)
        sectionHeader('KEY CLINICAL ISSUES')
        rj.key_issues.forEach((issue: string, ii: number) => {
          checkPage(8)
          setFill(RED_BG); setDraw([255,200,200]); doc.setLineWidth(0.2)
          doc.rect(ML, y - 3.5, TW, 6.5, 'FD')
          bold(8.5); setColor(RED_FG); doc.text(`${ii + 1}.`, ML + 2, y + 1.5)
          normal(8.5); setColor(DARK); doc.text(issue, ML + 9, y + 1.5)
          y += 7.5
        })
        y += 2
      }

      // ── Recommendations ─────────────────────────────────────────────────────
      if (rj.recommendations?.length) {
        checkPage(10 + rj.recommendations.length * 7)
        sectionHeader('CLINICAL RECOMMENDATIONS')
        rj.recommendations.forEach((rec: string, ri: number) => {
          checkPage(8)
          setFill(GREEN_BG); setDraw([180,230,200]); doc.setLineWidth(0.2)
          doc.rect(ML, y - 3.5, TW, 6.5, 'FD')
          bold(8.5); setColor(GREEN_FG); doc.text('✓', ML + 2, y + 1.5)
          normal(8.5); setColor(DARK)
          const recLines = doc.splitTextToSize(rec, TW - 12)
          doc.text(recLines[0], ML + 9, y + 1.5)
          y += 7.5
        })
        y += 2
      }

      // ── Next Plan ────────────────────────────────────────────────────────────
      if (rj.next_plan) {
        checkPage(22)
        setFill([235,248,255]); setDraw([170,210,240]); doc.setLineWidth(0.3)
        doc.rect(ML, y, TW, 18, 'FD')
        bold(8.5); setColor([20,80,160]); doc.text('TREATMENT PLAN — NEXT PHASE', ML + 3, y + 6)
        normal(9.5); setColor(DARK)
        const npLines = doc.splitTextToSize(rj.next_plan, TW - 6)
        npLines.slice(0, 2).forEach((l: string, li: number) => doc.text(l, ML + 3, y + 11 + li * 4.5))
        y += 22
      }

      // ════════════════════════════════════════════════════════════════════════
      // EXERCISE SESSION TABLE
      // ════════════════════════════════════════════════════════════════════════
      if (sessions.length > 0) {
        checkPage(20)
        sectionHeader('EXERCISE SESSION HISTORY')

        // Table header
        const cols = [
          { label: 'Date',        x: ML,       w: 28 },
          { label: 'Exercise',    x: ML + 28,  w: 52 },
          { label: 'Reps',        x: ML + 80,  w: 20 },
          { label: 'Form Score',  x: ML + 100, w: 28 },
          { label: 'Duration',    x: ML + 128, w: 27 },
          { label: 'Status',      x: ML + 155, w: 25 },
        ]

        setFill(ACCENT); doc.rect(ML, y, TW, 6.5, 'F')
        bold(7.5); setColor(WHITE)
        cols.forEach(c => doc.text(c.label, c.x + 1.5, y + 4.5))
        y += 6.5

        sessions.slice(0, 12).forEach((s, si) => {
          checkPage(7)
          setFill(si % 2 === 0 ? WHITE : LIGHT_BG)
          doc.rect(ML, y, TW, 6.5, 'F')

          normal(8); setColor(DARK)
          const dt = s.completed_at ? new Date(s.completed_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—'
          const formPct = s.form_score != null ? `${Math.round(s.form_score * 100)}%` : '—'
          const dur = s.duration_seconds != null ? `${Math.round(s.duration_seconds / 60)}m` : '—'
          const statusTxt = s.form_score != null && s.form_score >= 0.75 ? 'Good' : s.form_score != null && s.form_score >= 0.5 ? 'Fair' : 'Review'
          const statusFgCol = s.form_score != null && s.form_score >= 0.75 ? GREEN_FG : s.form_score != null && s.form_score >= 0.5 ? YEL_FG : RED_FG

          doc.text(dt, cols[0].x + 1.5, y + 4.5)
          const exName = doc.splitTextToSize((s.exercise_name ?? 'Exercise'), cols[1].w - 2)
          doc.text(exName[0], cols[1].x + 1.5, y + 4.5)
          doc.text(String(s.reps_completed ?? 0), cols[2].x + 1.5, y + 4.5)
          doc.text(formPct, cols[3].x + 1.5, y + 4.5)
          doc.text(dur, cols[4].x + 1.5, y + 4.5)
          bold(8); setColor(statusFgCol); doc.text(statusTxt, cols[5].x + 1.5, y + 4.5)
          normal(8); setColor(DARK)
          y += 6.5
        })
        // table border
        setDraw(BORDER); doc.setLineWidth(0.3)
        doc.rect(ML, y - sessions.slice(0,12).length * 6.5 - 6.5, TW, sessions.slice(0,12).length * 6.5 + 6.5, 'D')
        y += 4
      }

      // ════════════════════════════════════════════════════════════════════════
      // PRESCRIPTIONS TABLE
      // ════════════════════════════════════════════════════════════════════════
      if (prescriptions.length > 0) {
        checkPage(20)
        sectionHeader('CURRENT PRESCRIPTIONS')

        setFill(ACCENT); doc.rect(ML, y, TW, 6.5, 'F')
        bold(7.5); setColor(WHITE)
        doc.text('Activity',  ML + 1.5,      y + 4.5)
        doc.text('Type',      ML + 62,        y + 4.5)
        doc.text('Target',    ML + 90,        y + 4.5)
        doc.text('Frequency', ML + 115,       y + 4.5)
        doc.text('Priority',  ML + 145,       y + 4.5)
        doc.text('Status',    ML + 165,       y + 4.5)
        y += 6.5

        prescriptions.forEach((rx, ri) => {
          checkPage(7)
          setFill(ri % 2 === 0 ? WHITE : LIGHT_BG); doc.rect(ML, y, TW, 6.5, 'F')
          normal(8); setColor(DARK)
          const actName = rx.exercise_name ?? rx.game_type ?? 'Activity'
          doc.text(doc.splitTextToSize(actName, 58)[0], ML + 1.5, y + 4.5)
          doc.text(rx.exercise_name ? 'Exercise' : 'Game', ML + 62, y + 4.5)
          doc.text(rx.target_reps ? `${rx.target_reps} reps` : '—', ML + 90, y + 4.5)
          doc.text(rx.frequency ?? '—', ML + 115, y + 4.5)
          const priBg  = rx.priority==='high'? RED_BG  : rx.priority==='low'? [235,235,235] : YEL_BG
          const priFg  = rx.priority==='high'? RED_FG  : rx.priority==='low'? MUTED         : YEL_FG
          bold(7.5); setColor(priFg)
          const ptw = doc.getTextWidth(rx.priority ?? '')
          setFill(priBg); doc.rect(ML + 143, y + 0.5, ptw + 4, 5, 'F')
          doc.text(rx.priority ?? '—', ML + 145, y + 4.5)
          normal(8); setColor(rx.status==='active'? GREEN_FG : MUTED)
          doc.text(rx.status ?? '—', ML + 165, y + 4.5)
          setColor(DARK)
          y += 6.5
        })
        setDraw(BORDER); doc.setLineWidth(0.3)
        doc.rect(ML, y - prescriptions.length * 6.5 - 6.5, TW, prescriptions.length * 6.5 + 6.5, 'D')
        y += 4
      }

      // ════════════════════════════════════════════════════════════════════════
      // DOCTOR ATTENTION ALERT
      // ════════════════════════════════════════════════════════════════════════
      if (rj.doctor_attention || rj.risk_level === 'high') {
        checkPage(20)
        setFill(RED_BG); setDraw([220,80,80]); doc.setLineWidth(0.4)
        doc.rect(ML, y, TW, 16, 'FD')
        bold(10); setColor(RED_FG)
        doc.text('⚠  IMMEDIATE DOCTOR ATTENTION REQUIRED', ML + 3, y + 7)
        normal(9); setColor(DARK)
        doc.text('Risk level is HIGH. Please review this patient immediately and adjust the treatment plan.', ML + 3, y + 13)
        y += 20
      }

      // ════════════════════════════════════════════════════════════════════════
      // SIGNATURE BLOCK
      // ════════════════════════════════════════════════════════════════════════
      checkPage(35)
      y += 5
      hline(y, BORDER, 0.3); y += 8

      const sigColW = TW / 3
      // Doctor signature
      hline(y + 8, DARK, 0.4)
      bold(8); setColor(MUTED)
      doc.text(identity?.name ? `Dr. ${identity.name}` : 'Treating Physician', ML, y + 12)
      doc.text('Signature & Stamp', ML, y + 16)

      // Date
      hline(y + 8, DARK, 0.4)
      doc.text('Date', ML + sigColW, y + 12)
      doc.text(rptDate, ML + sigColW, y + 16)

      // Verified
      hline(y + 8, DARK, 0.4)
      doc.text('Report Generated by', ML + sigColW * 2, y + 12)
      setColor(PRIMARY); doc.text('Nakshatra AI System', ML + sigColW * 2, y + 16)
      y += 22

      // ════════════════════════════════════════════════════════════════════════
      // FOOTER on every page
      // ════════════════════════════════════════════════════════════════════════
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let pg = 1; pg <= totalPages; pg++) {
        doc.setPage(pg)
        setFill(PRIMARY); doc.rect(0, 287, W, 10, 'F')
        normal(7); setColor([200,240,238])
        doc.text('Nakshatra Rehabilitation Center — Confidential Medical Record — Not for public distribution', ML, 293)
        doc.text(`Page ${pg} of ${totalPages}`, W - 28, 293)
      }

      doc.save(`MedicalReport_${p.name.replace(/\s+/g,'_')}_${rptDate.replace(/\s+/g,'-')}.pdf`)

    } catch (e) {
      console.error("Failed to generate PDF", e)
    }
  }

  useEffect(() => {
    if (role !== "doctor") {
      router.replace("/login")
      return
    }
    setLoading(true)
    Promise.all([
      patientsApi.get(patientId),
      prescriptionsApi.list(patientId).catch(() => [] as Prescription[]),
      exercisesApi.list(),
      sessionsApi.list(patientId, 10),
      aiApi.listReports(patientId).catch(() => [] as PatientReport[]),
      progressApi.get(patientId).catch(() => null),
      gameSessionsApi.list(patientId, undefined, 50).catch(() => ({ sessions: [], total: 0 })),
    ])
      .then(([p, rx, ex, sess, rpts, prog, games]) => {
        setPatient(p)
        setPrescriptions(rx)
        setExercises(ex)
        setSessions(sess.sessions)
        setReports(rpts)
        setProgress(prog)
        setGameSessions((games as { sessions: GameSessionListItem[] }).sessions)
        setProfileForm({
          diagnosis: p.diagnosis ?? "",
          injury_type: p.injury_type ?? "",
          severity: p.severity ?? "",
          status: p.status ?? "registered",
          condition_notes: p.condition_notes ?? "",
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [patientId, role, router])

  async function handleSaveProfile() {
    if (!patient) return
    setSavingProfile(true)
    try {
      const updated = await patientsApi.update(patient.id, {
        diagnosis: profileForm.diagnosis || undefined,
        injury_type: profileForm.injury_type || undefined,
        severity: profileForm.severity || undefined,
        status: profileForm.status || undefined,
        condition_notes: profileForm.condition_notes || undefined,
      })
      setPatient(updated)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (err) {
      console.error("Failed to update patient:", err)
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleAddPrescription() {
    if (!identity) return
    setAddingRx(true)
    try {
      await prescriptionsApi.create({
        patient_id: patientId,
        doctor_id: identity.id,
        exercise_id: rxForm.prescribeType === "exercise" ? rxForm.exercise_id || undefined : undefined,
        game_type: rxForm.prescribeType === "game" ? rxForm.game_type || undefined : undefined,
        target_reps: rxForm.target_reps ? Number(rxForm.target_reps) : undefined,
        frequency: rxForm.frequency,
        priority: rxForm.priority,
        notes: rxForm.notes || undefined,
      })
      const updated = await prescriptionsApi.list(patientId)
      setPrescriptions(updated)
      setShowRxForm(false)
      setRxForm({ exercise_id: "", game_type: "", prescribeType: "exercise", target_reps: "", frequency: "daily", priority: "normal", notes: "" })
    } catch (err) {
      console.error("Failed to create prescription:", err)
    } finally {
      setAddingRx(false)
    }
  }

  async function handlePrescriptionStatus(id: string, status: string) {
    await prescriptionsApi.update(id, { status }).catch(console.error)
    const updated = await prescriptionsApi.list(patientId).catch(() => prescriptions)
    setPrescriptions(updated)
  }

  async function handleGenerateReport() {
    setGeneratingReport(true)
    try {
      await aiApi.generateReport(patientId)
      const updated = await aiApi.listReports(patientId).catch(() => reports)
      setReports(updated)
    } catch (err) {
      console.error(err)
    } finally {
      setGeneratingReport(false)
    }
  }

  const latestReport = reports[0]?.report ?? null

  if (loading) {
    return (
      <AppLayout>
        <p className="text-muted-foreground">Loading patient…</p>
      </AppLayout>
    )
  }

  if (!patient) {
    return (
      <AppLayout>
        <p className="text-muted-foreground">Patient not found.</p>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/doctor"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{patient.name}</h1>
              <Badge
                variant="secondary"
                className={STATUS_COLORS[patient.status ?? ""] ?? "bg-muted text-muted-foreground"}
              >
                {(patient.status ?? "unknown").replace("_", " ")}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[patient.age ? `Age ${patient.age}` : null, patient.phone, patient.email]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Link href={`/doctor/${patientId}/messages`}>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Prescriptions
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Chat
            </TabsTrigger>
          </TabsList>

          {/* ── Profile Tab ── */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Clinical Intake</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Diagnosis</Label>
                  <Input
                    placeholder="e.g. ACL tear, right knee"
                    value={profileForm.diagnosis}
                    onChange={(e) => setProfileForm((f) => ({ ...f, diagnosis: e.target.value }))}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Injury Type</Label>
                    <Select
                      value={profileForm.injury_type}
                      onValueChange={(v) => setProfileForm((f) => ({ ...f, injury_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {["acl", "fracture", "stroke", "shoulder", "back", "hip", "knee", "other"].map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Severity</Label>
                    <Select
                      value={profileForm.severity}
                      onValueChange={(v) => setProfileForm((f) => ({ ...f, severity: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {["mild", "moderate", "severe"].map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={profileForm.status}
                    onValueChange={(v) => setProfileForm((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {["registered", "evaluated", "in_treatment", "discharged"].map((s) => (
                        <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Clinical Notes</Label>
                  <Input
                    placeholder="Additional notes…"
                    value={profileForm.condition_notes}
                    onChange={(e) => setProfileForm((f) => ({ ...f, condition_notes: e.target.value }))}
                  />
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {profileSaved ? "Saved!" : savingProfile ? "Saving…" : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Prescriptions Tab ── */}
          <TabsContent value="prescriptions">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Prescriptions ({prescriptions.length})
                </h2>
                <Button
                  size="sm"
                  onClick={() => setShowRxForm((v) => !v)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Prescription
                </Button>
              </div>

              {showRxForm && (
                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle className="text-base">New Prescription</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Type</Label>
                      <div className="flex gap-2">
                        {(["exercise", "game"] as const).map((t) => (
                          <Button
                            key={t}
                            variant={rxForm.prescribeType === t ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRxForm((f) => ({ ...f, prescribeType: t, exercise_id: "", game_type: "" }))}
                            className="capitalize"
                          >
                            {t}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {rxForm.prescribeType === "exercise" ? (
                      <div className="space-y-1.5">
                        <Label>Exercise</Label>
                        <Select value={rxForm.exercise_id} onValueChange={(v) => setRxForm((f) => ({ ...f, exercise_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select exercise…" /></SelectTrigger>
                          <SelectContent>
                            {exercises.map((e) => (
                              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label>Game Type</Label>
                        <Select value={rxForm.game_type} onValueChange={(v) => setRxForm((f) => ({ ...f, game_type: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select game…" /></SelectTrigger>
                          <SelectContent>
                            {["memory", "reaction", "pattern"].map((g) => (
                              <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label>Target Reps</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 10"
                          value={rxForm.target_reps}
                          onChange={(e) => setRxForm((f) => ({ ...f, target_reps: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Frequency</Label>
                        <Select value={rxForm.frequency} onValueChange={(v) => setRxForm((f) => ({ ...f, frequency: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["daily", "3x_week", "weekly"].map((f) => (
                              <SelectItem key={f} value={f}>{f.replace("_", " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Priority</Label>
                        <Select value={rxForm.priority} onValueChange={(v) => setRxForm((f) => ({ ...f, priority: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["high", "normal", "low"].map((p) => (
                              <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Notes (optional)</Label>
                      <Input
                        placeholder="Instructions for the patient…"
                        value={rxForm.notes}
                        onChange={(e) => setRxForm((f) => ({ ...f, notes: e.target.value }))}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleAddPrescription} disabled={addingRx}>
                        {addingRx ? "Saving…" : "Save Prescription"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowRxForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prescriptions yet.</p>
              ) : (
                <div className="space-y-3">
                  {prescriptions.map((rx) => (
                    <Card key={rx.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {rx.exercise_name ?? rx.game_type ?? "Activity"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {[
                              rx.target_reps ? `${rx.target_reps} reps` : null,
                              rx.frequency?.replace("_", " "),
                              `${rx.compliance?.sessions_completed ?? 0} sessions done`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={
                              rx.priority === "high"
                                ? "bg-red-100 text-red-700"
                                : "bg-primary/10 text-primary"
                            }
                          >
                            {rx.priority}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={
                              rx.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {rx.status}
                          </Badge>
                          {rx.status === "active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => handlePrescriptionStatus(rx.id, "paused")}
                            >
                              Pause
                            </Button>
                          )}
                          {rx.status === "paused" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => handlePrescriptionStatus(rx.id, "active")}
                            >
                              Resume
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Sessions Tab ── */}
          <TabsContent value="sessions">
            <RecentSessions sessions={sessions} loading={loading} />
          </TabsContent>

          {/* ── Reports Tab ── */}
          <TabsContent value="reports">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">AI Reports</h2>
                <Button
                  size="sm"
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={generatingReport ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                  {generatingReport ? "Generating…" : "Generate Report"}
                </Button>
              </div>

              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reports yet. Click Generate Report.</p>
              ) : (
                reports.map((r, i) => {
                  const rj = r.report || {}
                  return (
                    <Card key={r.id ?? i} id={`report-${r.id ?? i}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-base">
                            {i === 0 ? "Latest Report" : `Report — ${r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}`}
                          </CardTitle>
                          <div className="flex gap-2">
                            {rj.progress_trend && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                rj.progress_trend === "improving" ? "bg-green-100 text-green-700" :
                                rj.progress_trend === "declining" ? "bg-red-100 text-red-700" :
                                "bg-yellow-100 text-yellow-700"
                              }`}>
                                {rj.progress_trend === "improving" ? "↑" : rj.progress_trend === "declining" ? "↓" : "→"} {rj.progress_trend}
                              </span>
                            )}
                            {rj.risk_level && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                rj.risk_level === "high" ? "bg-red-100 text-red-700" :
                                rj.risk_level === "medium" ? "bg-yellow-100 text-yellow-700" :
                                "bg-green-100 text-green-700"
                              }`}>
                                {rj.risk_level === "high" && <AlertTriangle className="h-3 w-3" />}
                                {rj.risk_level} risk
                              </span>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs flex items-center gap-1 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadPdf(r.id ?? String(i), i);
                              }}
                            >
                              <Download className="h-3 w-3" />
                              PDF
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <p className="text-foreground leading-relaxed">{rj.summary}</p>
                        {(rj.key_issues?.length ?? 0) > 0 && (
                          <div>
                            <p className="font-medium text-muted-foreground mb-1">Key Issues</p>
                            <ul className="space-y-1">
                              {rj.key_issues!.map((issue, j) => (
                                <li key={j} className="flex items-start gap-2 text-foreground">
                                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(rj.recommendations?.length ?? 0) > 0 && (
                          <div>
                            <p className="font-medium text-muted-foreground mb-1">Recommendations</p>
                            <ul className="space-y-1">
                              {rj.recommendations!.map((rec, j) => (
                                <li key={j} className="flex items-start gap-2 text-foreground">
                                  <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {rj.next_plan && (
                          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                            <p className="font-medium text-primary text-xs mb-1">Next Plan</p>
                            <p className="text-foreground">{rj.next_plan}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </TabsContent>

          {/* ── Analytics Tab ── */}
          <TabsContent value="analytics">
            {progress ? (
              <div className="space-y-6">
                {/* KPI cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      label: "Total Sessions",
                      value: progress.summary.total_exercise_sessions + progress.summary.total_game_sessions,
                      icon: Activity,
                      color: "text-blue-600",
                      bg: "bg-blue-50",
                    },
                    {
                      label: "Avg Form Score",
                      value: progress.summary.avg_form_score != null
                        ? `${Math.round(progress.summary.avg_form_score * 100)}%`
                        : "—",
                      icon: Target,
                      color: "text-green-600",
                      bg: "bg-green-50",
                    },
                    {
                      label: "Active Streak",
                      value: `${progress.summary.current_streak_days}d`,
                      icon: Flame,
                      color: "text-orange-600",
                      bg: "bg-orange-50",
                    },
                    {
                      label: "Active Days",
                      value: progress.summary.total_active_days,
                      icon: Zap,
                      color: "text-purple-600",
                      bg: "bg-purple-50",
                    },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <Card key={label}>
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
                          <Icon className={`h-5 w-5 ${color}`} />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{value}</p>
                          <p className="text-xs text-muted-foreground">{label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Form score trend chart */}
                {progress.exercise_progress.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Form Score Trend (last {progress.exercise_progress.length} days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={progress.exercise_progress.map(d => ({
                          date: new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
                          form: d.avg_form_score != null ? Math.round(d.avg_form_score * 100) : null,
                          reps: d.total_reps,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                          <Tooltip formatter={(v: number) => [`${v}%`, "Form Score"]} />
                          <Line
                            type="monotone"
                            dataKey="form"
                            stroke="#009688"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Session frequency bar chart */}
                {progress.exercise_progress.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-primary" />
                        Daily Reps
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={progress.exercise_progress.map(d => ({
                          date: new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
                          reps: d.total_reps,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="reps" fill="#009688" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Body part breakdown */}
                {progress.body_part_breakdown.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="h-4 w-4 text-primary" />
                        Body Part Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6">
                        <ResponsiveContainer width={160} height={160}>
                          <PieChart>
                            <Pie
                              data={progress.body_part_breakdown}
                              dataKey="sessions"
                              nameKey="body_part"
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                            >
                              {progress.body_part_breakdown.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={["#009688", "#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#F44336"][i % 6]}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v, n) => [v, n]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-1.5">
                          {progress.body_part_breakdown.map((b, i) => (
                            <div key={b.body_part} className="flex items-center gap-2 text-sm">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ background: ["#009688","#4CAF50","#2196F3","#FF9800","#9C27B0","#F44336"][i%6] }}
                              />
                              <span className="capitalize text-foreground">{b.body_part}</span>
                              <span className="text-muted-foreground ml-auto">{b.sessions} sessions</span>
                              {b.avg_form_score != null && (
                                <span className="text-muted-foreground">· {Math.round(b.avg_form_score * 100)}% form</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Game performance */}
                {gameSessions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="h-4 w-4 text-primary" />
                        Cognitive Game Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {(["memory", "reaction", "stroop", "trail_making"] as const).map((gt) => {
                          const gs = gameSessions.filter(s => s.game_type === gt)
                          if (gs.length === 0) return null
                          const avgAcc = gs.reduce((s, g) => s + (g.accuracy ?? 0), 0) / gs.length
                          const best = Math.max(...gs.map(g => g.score ?? 0))
                          return (
                            <div key={gt} className="rounded-xl border border-border bg-muted/30 p-3">
                              <p className="text-xs font-medium text-muted-foreground capitalize mb-1">
                                {gt.replace("_", " ")}
                              </p>
                              <p className="text-lg font-bold text-foreground">{Math.round(avgAcc * 100)}%</p>
                              <p className="text-xs text-muted-foreground">avg accuracy · {gs.length} sessions</p>
                              <p className="text-xs text-muted-foreground">best score: {best}</p>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No analytics data available yet.</p>
            )}
          </TabsContent>

          {/* ── AI Chat Tab ── */}
          <TabsContent value="ai">
            {identity && (
              <DoctorChat
                doctorId={identity.id}
                patientId={patientId}
                patientName={patient.name}
                latestReport={latestReport}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
