"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { staffApi, patientsApi, type StaffListItem, type PatientCreateResponse } from "@/lib/api"
import { useApp } from "@/lib/app-context"
import { UserPlus, CheckCircle } from "lucide-react"

export default function ReceptionPage() {
  const { role } = useApp()
  const router = useRouter()

  const [doctors, setDoctors] = useState<StaffListItem[]>([])
  const [created, setCreated] = useState<PatientCreateResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "",
    age: "",
    phone: "",
    email: "",
    condition_notes: "",
    doctor_id: "",
    emergency: false,
  })

  useEffect(() => {
    if (role !== "receptionist") {
      router.replace("/")
      return
    }
    staffApi.list("doctor")
      .then(setDoctors)
      .catch(console.error)
  }, [role, router])

  function setField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError("Patient name is required.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await patientsApi.create({
        name: form.name.trim(),
        age: form.age ? Number(form.age) : undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        condition_notes: form.condition_notes || undefined,
        doctor_id: form.doctor_id || undefined,
        emergency: form.emergency,
      })
      setCreated(result)
      setForm({
        name: "",
        age: "",
        phone: "",
        email: "",
        condition_notes: "",
        doctor_id: "",
        emergency: false,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register patient.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Register Patient</h1>
          <p className="mt-1 text-muted-foreground">
            Enter patient details to register them in the system
          </p>
        </div>

        {created && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex items-start gap-3 p-4">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Patient registered successfully!</p>
                <p className="mt-0.5 text-sm text-green-700">
                  <strong>{created.name}</strong> has been added with status{" "}
                  <strong>{created.status}</strong>.
                </p>
                <p className="mt-0.5 text-xs text-green-600">ID: {created.id}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <CardTitle>Patient Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Ravi Kumar"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="e.g. 34"
                    min={1}
                    max={120}
                    value={form.age}
                    onChange={(e) => setField("age", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. ravi@example.com"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="condition_notes">Initial Notes</Label>
                <Input
                  id="condition_notes"
                  placeholder="e.g. Right knee pain after fall"
                  value={form.condition_notes}
                  onChange={(e) => setField("condition_notes", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doctor">Assign Doctor</Label>
                <Select value={form.doctor_id} onValueChange={(v) => setField("doctor_id", v)}>
                  <SelectTrigger id="doctor">
                    <SelectValue placeholder="Select a doctor (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}{d.specialization ? ` — ${d.specialization}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="emergency"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={form.emergency}
                  onChange={(e) => setField("emergency", e.target.checked)}
                />
                <Label htmlFor="emergency" className="cursor-pointer font-normal">
                  Emergency registration (minimal data required)
                </Label>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Registering…" : "Register Patient"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
