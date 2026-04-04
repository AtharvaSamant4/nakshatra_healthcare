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
  type Patient,
  type Prescription,
  type Exercise,
  type SessionListItem,
} from "@/lib/api"
import { useApp } from "@/lib/app-context"
import { ArrowLeft, User, ClipboardList, Dumbbell, MessageSquare, Plus, Save } from "lucide-react"

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

  useEffect(() => {
    if (role !== "doctor") {
      router.replace("/")
      return
    }
    setLoading(true)
    Promise.all([
      patientsApi.get(patientId),
      prescriptionsApi.list(patientId).catch(() => [] as Prescription[]),
      exercisesApi.list(),
      sessionsApi.list(patientId, 10),
    ])
      .then(([p, rx, ex, sess]) => {
        setPatient(p)
        setPrescriptions(rx)
        setExercises(ex)
        setSessions(sess.sessions)
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
                              `${rx.compliance.sessions_completed} sessions done`,
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
        </Tabs>
      </div>
    </AppLayout>
  )
}
