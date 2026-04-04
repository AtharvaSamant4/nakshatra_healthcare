"use client"

import React from "react"

// ─── Primitive building blocks ─────────────────────────────────────────────

function Node({
  children,
  color = "bg-white border-gray-300",
  textColor = "text-gray-800",
  shape = "rect",
  className = "",
}: {
  children: React.ReactNode
  color?: string
  textColor?: string
  shape?: "rect" | "diamond" | "oval" | "parallelogram"
  className?: string
}) {
  if (shape === "diamond") {
    return (
      <div className={`relative flex items-center justify-center ${className}`} style={{ width: 140, height: 80 }}>
        <div
          className={`absolute inset-0 border-2 ${color} rotate-45 rounded`}
          style={{ margin: "14px" }}
        />
        <span className={`relative z-10 text-center text-xs font-semibold leading-tight px-2 ${textColor}`}>
          {children}
        </span>
      </div>
    )
  }
  if (shape === "oval") {
    return (
      <div
        className={`flex items-center justify-center rounded-full border-2 px-4 py-2 text-xs font-bold text-center leading-tight ${color} ${textColor} ${className}`}
        style={{ minWidth: 120, minHeight: 40 }}
      >
        {children}
      </div>
    )
  }
  if (shape === "parallelogram") {
    return (
      <div className={`relative flex items-center justify-center ${className}`} style={{ minWidth: 130 }}>
        <div
          className={`border-2 px-4 py-2 text-xs font-semibold text-center leading-tight skew-x-[-12deg] ${color} ${textColor}`}
        >
          <span className="inline-block skew-x-[12deg]">{children}</span>
        </div>
      </div>
    )
  }
  // default: rect
  return (
    <div
      className={`flex items-center justify-center rounded-lg border-2 px-3 py-2 text-xs font-semibold text-center leading-tight ${color} ${textColor} ${className}`}
      style={{ minWidth: 120 }}
    >
      {children}
    </div>
  )
}

function Arrow({
  dir = "down",
  label,
  length = 32,
}: {
  dir?: "down" | "right" | "left" | "up"
  label?: string
  length?: number
}) {
  if (dir === "right") {
    return (
      <div className="flex items-center">
        <div className="relative flex items-center">
          <div className="h-0.5 bg-gray-400" style={{ width: length }} />
          <div
            className="absolute right-0 border-t-4 border-b-4 border-l-8 border-t-transparent border-b-transparent border-l-gray-500"
            style={{ width: 0, height: 0 }}
          />
        </div>
        {label && <span className="ml-1 text-[10px] text-gray-500 whitespace-nowrap">{label}</span>}
      </div>
    )
  }
  if (dir === "left") {
    return (
      <div className="flex items-center">
        {label && <span className="mr-1 text-[10px] text-gray-500 whitespace-nowrap">{label}</span>}
        <div className="relative flex items-center">
          <div
            className="absolute left-0 border-t-4 border-b-4 border-r-8 border-t-transparent border-b-transparent border-r-gray-500"
            style={{ width: 0, height: 0 }}
          />
          <div className="h-0.5 bg-gray-400 ml-2" style={{ width: length }} />
        </div>
      </div>
    )
  }
  // down (default)
  return (
    <div className="flex flex-col items-center" style={{ height: length }}>
      <div className="w-0.5 bg-gray-400 flex-1" />
      {label && (
        <span className="text-[10px] text-gray-500 whitespace-nowrap -mt-1 mb-0.5">{label}</span>
      )}
      <div
        className="border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-gray-500"
        style={{ width: 0, height: 0 }}
      />
    </div>
  )
}

function SectionLabel({
  children,
  color = "bg-gray-100 border-gray-300",
}: {
  children: React.ReactNode
  color?: string
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-2 ${color}`}
    >
      {children}
    </div>
  )
}

function Col({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col items-center gap-0 ${className}`}>{children}</div>
}

function Row({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-row items-center gap-0 ${className}`}>{children}</div>
}

// ─── Main flowchart ─────────────────────────────────────────────────────────

export default function FlowchartPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 overflow-x-auto">
      <div className="mx-auto" style={{ minWidth: 1100 }}>
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">RehabAI — System Flowchart</h1>
          <p className="mt-1 text-sm text-gray-500">
            End-to-end flow: AI-powered Physical Joint Recovery &amp; Cognitive Memory Improvement
          </p>
        </div>

        {/* ── LAYER 0: Entry ─────────────────────────────────────────────── */}
        <Col>
          <SectionLabel color="bg-indigo-50 border-indigo-200">User Entry</SectionLabel>

          <Node shape="oval" color="bg-indigo-600 border-indigo-700" textColor="text-white">
            Start
          </Node>
          <Arrow dir="down" length={28} />

          <Node color="bg-indigo-100 border-indigo-400" textColor="text-indigo-900">
            Open RehabAI Platform
          </Node>
          <Arrow dir="down" length={28} />

          <Node shape="diamond" color="bg-amber-100 border-amber-400" textColor="text-amber-900">
            Select Role
          </Node>
          <Arrow dir="down" length={20} />

          {/* ── LAYER 1: Three role branches ───────────────────────────── */}
          <Row className="items-start gap-10">
            {/* RECEPTIONIST BRANCH */}
            <Col>
              <SectionLabel color="bg-amber-50 border-amber-300">Receptionist</SectionLabel>
              <Node color="bg-amber-200 border-amber-500" textColor="text-amber-900">
                Receptionist Dashboard
              </Node>
              <Arrow dir="down" length={28} />
              <Node color="bg-amber-100 border-amber-400" textColor="text-amber-900">
                Register New Patient
              </Node>
              <Arrow dir="down" length={24} />
              <Node color="bg-amber-100 border-amber-400" textColor="text-amber-900">
                Assign Doctor &amp; Set Status
              </Node>
              <Arrow dir="down" length={24} />
              <Node color="bg-amber-100 border-amber-400" textColor="text-amber-900">
                Patient Record Saved (Supabase)
              </Node>
              <Arrow dir="down" length={24} />
              <Node shape="oval" color="bg-amber-300 border-amber-600" textColor="text-amber-900">
                Done
              </Node>
            </Col>

            {/* DOCTOR BRANCH */}
            <Col>
              <SectionLabel color="bg-blue-50 border-blue-300">Doctor</SectionLabel>
              <Node color="bg-blue-200 border-blue-500" textColor="text-blue-900">
                Doctor Dashboard
              </Node>
              <Arrow dir="down" length={24} />
              <Node color="bg-blue-100 border-blue-400" textColor="text-blue-900">
                View Patient List
              </Node>
              <Arrow dir="down" length={24} />
              <Node color="bg-blue-100 border-blue-400" textColor="text-blue-900">
                Open Patient Profile
              </Node>
              <Arrow dir="down" length={20} />
              {/* Doctor sub-actions */}
              <Row className="items-start gap-4">
                <Col>
                  <Node color="bg-blue-50 border-blue-300" textColor="text-blue-800" className="w-[130px]">
                    Prescribe Exercises (body part, sets, reps)
                  </Node>
                  <Arrow dir="down" length={20} />
                  <Node color="bg-blue-50 border-blue-300" textColor="text-blue-800" className="w-[130px]">
                    Prescription Saved to DB
                  </Node>
                </Col>
                <Arrow dir="right" length={24} />
                <Col>
                  <Node color="bg-blue-50 border-blue-300" textColor="text-blue-800" className="w-[130px]">
                    View Progress Charts &amp; Analytics
                  </Node>
                  <Arrow dir="down" length={20} />
                  <Node color="bg-blue-50 border-blue-300" textColor="text-blue-800" className="w-[130px]">
                    AI Insights Panel (Gemini summaries)
                  </Node>
                </Col>
                <Arrow dir="right" length={24} />
                <Col>
                  <Node color="bg-blue-50 border-blue-300" textColor="text-blue-800" className="w-[130px]">
                    Messaging (chat with patient)
                  </Node>
                  <Arrow dir="down" length={20} />
                  <Node color="bg-blue-50 border-blue-300" textColor="text-blue-800" className="w-[130px]">
                    Messages Saved to DB
                  </Node>
                </Col>
              </Row>
            </Col>

            {/* PATIENT BRANCH */}
            <Col>
              <SectionLabel color="bg-green-50 border-green-300">Patient</SectionLabel>
              <Node color="bg-green-200 border-green-500" textColor="text-green-900">
                Patient Dashboard
              </Node>
              <Arrow dir="down" length={20} />
              <Node shape="diamond" color="bg-green-100 border-green-400" textColor="text-green-900">
                Choose Track
              </Node>
              <Arrow dir="down" length={20} />

              <Row className="items-start gap-8">
                {/* Physical Track */}
                <Col>
                  <SectionLabel color="bg-emerald-50 border-emerald-300">Physical Recovery</SectionLabel>

                  <Node color="bg-emerald-200 border-emerald-500" textColor="text-emerald-900" className="w-[150px]">
                    View Prescribed Exercises
                  </Node>
                  <Arrow dir="down" length={24} />
                  <Node color="bg-emerald-100 border-emerald-400" textColor="text-emerald-900" className="w-[150px]">
                    Select Exercise &amp; Body Part
                  </Node>
                  <Arrow dir="down" length={24} />
                  <Node color="bg-emerald-100 border-emerald-400" textColor="text-emerald-900" className="w-[150px]">
                    Enable Webcam Feed
                  </Node>
                  <Arrow dir="down" length={24} />
                  <Node color="bg-emerald-100 border-emerald-400" textColor="text-emerald-900" className="w-[150px]">
                    Real-time Joint Angle Tracking (CV)
                  </Node>
                  <Arrow dir="down" length={24} />
                  <Node color="bg-emerald-100 border-emerald-400" textColor="text-emerald-900" className="w-[150px]">
                    Count Reps, Measure Form Score
                  </Node>
                  <Arrow dir="down" length={24} />
                  <Node shape="diamond" color="bg-emerald-50 border-emerald-300" textColor="text-emerald-900">
                    Reps Goal Met?
                  </Node>
                  <Arrow dir="down" length={20} label="Yes" />
                  <Node color="bg-emerald-100 border-emerald-400" textColor="text-emerald-900" className="w-[150px]">
                    End Exercise Session
                  </Node>
                  <Arrow dir="down" length={24} />

                  {/* AI feedback block */}
                  <SectionLabel color="bg-purple-50 border-purple-300">AI Feedback Layer</SectionLabel>
                  <Node color="bg-purple-200 border-purple-500" textColor="text-purple-900" className="w-[150px]">
                    Send Session Data to Gemini AI
                  </Node>
                  <Arrow dir="down" length={20} />
                  <Node color="bg-purple-100 border-purple-400" textColor="text-purple-900" className="w-[150px]">
                    Generate Recovery Feedback (summary, tips, score)
                  </Node>
                  <Arrow dir="down" length={20} />
                  <Node color="bg-purple-100 border-purple-400" textColor="text-purple-900" className="w-[150px]">
                    Store Feedback in DB
                  </Node>
                  <Arrow dir="down" length={24} />

                  <SectionLabel color="bg-teal-50 border-teal-300">Persistence</SectionLabel>
                  <Node color="bg-teal-200 border-teal-500" textColor="text-teal-900" className="w-[150px]">
                    Save Exercise Session to Supabase
                  </Node>
                  <Arrow dir="down" length={24} />
                  <Node color="bg-teal-100 border-teal-400" textColor="text-teal-900" className="w-[150px]">
                    Update Patient Progress Record
                  </Node>
                  <Arrow dir="down" length={24} />

                  <SectionLabel color="bg-sky-50 border-sky-300">Output &amp; Analytics</SectionLabel>
                  <Node color="bg-sky-200 border-sky-500" textColor="text-sky-900" className="w-[150px]">
                    Session Summary Card (reps, form score, AI tips)
                  </Node>
                  <Arrow dir="down" length={20} />
                  <Node color="bg-sky-100 border-sky-400" textColor="text-sky-900" className="w-[150px]">
                    Progress Chart (trend over time)
                  </Node>
                  <Arrow dir="down" length={20} />
                  <Node color="bg-sky-100 border-sky-400" textColor="text-sky-900" className="w-[150px]">
                    Recovery Score Trend
                  </Node>
                  <Arrow dir="down" length={24} />
                  <Node shape="oval" color="bg-sky-400 border-sky-600" textColor="text-white" className="w-[140px]">
                    Physical Rehab Complete ✓
                  </Node>
                </Col>

                {/* Cognitive Track */}
                <Col>
                  <SectionLabel color="bg-rose-50 border-rose-300">Cognitive Improvement</SectionLabel>

                  <Node color="bg-rose-200 border-rose-500" textColor="text-rose-900" className="w-[150px]">
                    Browse Cognitive Games
                  </Node>
                  <Arrow dir="down" length={24} />
                  <Node shape="diamond" color="bg-rose-100 border-rose-400" textColor="text-rose-900">
                    Select Game Type
                  </Node>
                  <Arrow dir="down" length={20} />

                  <Row className="items-start gap-2">
                    <Col>
                      <Node
                        color="bg-rose-50 border-rose-300"
                        textColor="text-rose-800"
                        className="w-[80px] text-[10px]"
                      >
                        Memory Game
                      </Node>
                    </Col>
                    <Col>
                      <Node
                        color="bg-rose-50 border-rose-300"
                        textColor="text-rose-800"
                        className="w-[80px] text-[10px]"
                      >
                        Reaction Game
                      </Node>
                    </Col>
                    <Col>
                      <Node
                        color="bg-rose-50 border-rose-300"
                        textColor="text-rose-800"
                        className="w-[80px] text-[10px]"
                      >
                        Pattern Game
                      </Node>
                    </Col>
                  </Row>
                  <Arrow dir="down" length={20} />
                  <Node color="bg-rose-100 border-rose-400" textColor="text-rose-900" className="w-[150px]">
                    Play Game (interactive UI)
                  </Node>
                  <Arrow dir="down" length={24} />
                  <Node color="bg-rose-100 border-rose-400" textColor="text-rose-900" className="w-[150px]">
                    Track Score, Accuracy, Reaction Time, Level
                  </Node>
                  <Arrow dir="down" length={24} />
                  <Node shape="diamond" color="bg-rose-50 border-rose-300" textColor="text-rose-900">
                    Game Over?
                  </Node>
                  <Arrow dir="down" length={20} label="Yes" />
                  <Node color="bg-rose-100 border-rose-400" textColor="text-rose-900" className="w-[150px]">
                    Submit Game Session
                  </Node>
                  <Arrow dir="down" length={24} />

                  {/* AI feedback block */}
                  <SectionLabel color="bg-purple-50 border-purple-300">AI Feedback Layer</SectionLabel>
                  <Node color="bg-purple-200 border-purple-500" textColor="text-purple-900" className="w-[150px]">
                    Send Session Data to Gemini AI
                  </Node>
                  <Arrow dir="down" length={20} />
                  <Node color="bg-purple-100 border-purple-400" textColor="text-purple-900" className="w-[150px]">
                    Generate Cognitive Feedback (summary, tips, score)
                  </Node>
                  <Arrow dir="down" length={20} />
                  <Node color="bg-purple-100 border-purple-400" textColor="text-purple-900" className="w-[150px]">
                    Store Feedback in DB
                  </Node>
                  <Arrow dir="down" length={24} />

                  <SectionLabel color="bg-teal-50 border-teal-300">Persistence</SectionLabel>
                  <Node color="bg-teal-200 border-teal-500" textColor="text-teal-900" className="w-[150px]">
                    Save Game Session to Supabase
                  </Node>
                  <Arrow dir="down" length={24} />
                  <Node color="bg-teal-100 border-teal-400" textColor="text-teal-900" className="w-[150px]">
                    Update Patient Cognitive Record
                  </Node>
                  <Arrow dir="down" length={24} />

                  <SectionLabel color="bg-sky-50 border-sky-300">Output &amp; Analytics</SectionLabel>
                  <Node color="bg-sky-200 border-sky-500" textColor="text-sky-900" className="w-[150px]">
                    Game Summary (score, accuracy, AI tips)
                  </Node>
                  <Arrow dir="down" length={20} />
                  <Node color="bg-sky-100 border-sky-400" textColor="text-sky-900" className="w-[150px]">
                    Cognitive Progress Chart
                  </Node>
                  <Arrow dir="down" length={20} />
                  <Node color="bg-sky-100 border-sky-400" textColor="text-sky-900" className="w-[150px]">
                    Improvement Score Trend
                  </Node>
                  <Arrow dir="down" length={24} />
                  <Node shape="oval" color="bg-sky-400 border-sky-600" textColor="text-white" className="w-[140px]">
                    Cognitive Rehab Complete ✓
                  </Node>
                </Col>
              </Row>
            </Col>
          </Row>

          {/* ── LAYER 2: Shared backend ──────────────────────────────────── */}
          <div className="mt-12 w-full">
            <div className="border-t-2 border-dashed border-gray-300 mb-6" />
            <SectionLabel color="bg-gray-100 border-gray-400">
              Shared Backend Infrastructure (FastAPI + Supabase)
            </SectionLabel>
            <Row className="flex-wrap justify-center gap-4 mt-2">
              {[
                { label: "Users / Staff API", color: "bg-gray-200 border-gray-400" },
                { label: "Patients API", color: "bg-gray-200 border-gray-400" },
                { label: "Prescriptions API", color: "bg-gray-200 border-gray-400" },
                { label: "Exercise Sessions API", color: "bg-gray-200 border-gray-400" },
                { label: "Game Sessions API", color: "bg-gray-200 border-gray-400" },
                { label: "Progress API", color: "bg-gray-200 border-gray-400" },
                { label: "Feedback API", color: "bg-gray-200 border-gray-400" },
                { label: "Messaging API", color: "bg-gray-200 border-gray-400" },
              ].map((item) => (
                <Node key={item.label} color={item.color} textColor="text-gray-700" className="w-[130px]">
                  {item.label}
                </Node>
              ))}
            </Row>
            <Row className="justify-center mt-4 gap-8">
              <Arrow dir="down" length={28} />
            </Row>
            <Row className="justify-center gap-8">
              <Node color="bg-slate-700 border-slate-900" textColor="text-white" className="w-[220px]">
                🗄️ Supabase PostgreSQL Database
              </Node>
              <Node color="bg-violet-700 border-violet-900" textColor="text-white" className="w-[220px]">
                🤖 Google Gemini AI (gemini-2.5-flash)
              </Node>
            </Row>
          </div>

          {/* ── Legend ──────────────────────────────────────────────────── */}
          <div className="mt-12 rounded-xl border border-gray-200 bg-white p-4 shadow-sm w-full max-w-2xl">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500">Legend</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { color: "bg-indigo-600 border-indigo-700", text: "Entry / Terminator (oval)" },
                { color: "bg-amber-200 border-amber-500", text: "Receptionist Flow" },
                { color: "bg-blue-200 border-blue-500", text: "Doctor Flow" },
                { color: "bg-emerald-200 border-emerald-500", text: "Physical Rehab Track" },
                { color: "bg-rose-200 border-rose-500", text: "Cognitive Rehab Track" },
                { color: "bg-purple-200 border-purple-500", text: "AI Feedback (Gemini)" },
                { color: "bg-teal-200 border-teal-500", text: "DB Persistence" },
                { color: "bg-sky-200 border-sky-500", text: "Output & Analytics" },
                { color: "bg-amber-100 border-amber-400", text: "Decision (diamond)" },
                { color: "bg-gray-200 border-gray-400", text: "Backend API Services" },
              ].map(({ color, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <div className={`h-4 w-4 shrink-0 rounded border-2 ${color}`} />
                  <span className="text-[11px] text-gray-600">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </Col>
      </div>
    </div>
  )
}
