"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/lib/app-context"
import { staffApi, patientsApi, type StaffListItem, type PatientListItem } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dumbbell, Stethoscope, ClipboardList, Building2 } from "lucide-react"

type RoleKey = "patient" | "doctor" | "receptionist"

export default function RoleSelectorPage() {
  const { setSession } = useApp()
  const router = useRouter()

  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null)
  const [staff, setStaff] = useState<StaffListItem[]>([])
  const [patients, setPatients] = useState<PatientListItem[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      staffApi.list().catch(() => [] as StaffListItem[]),
      patientsApi.list().catch(() => [] as PatientListItem[]),
    ])
      .then(([s, p]) => {
        setStaff(s)
        setPatients(p)
      })
      .finally(() => setLoading(false))
  }, [])

  const doctors = staff.filter((s) => s.role === "doctor")
  const receptionists = staff.filter((s) => s.role === "receptionist")

  function handleRoleCard(role: RoleKey) {
    setSelectedRole(role)
    setSelectedId("")
  }

  function handleEnter() {
    if (!selectedRole || !selectedId) return

    if (selectedRole === "patient") {
      const p = patients.find((x) => x.id === selectedId)
      if (!p) return
      setSession("patient", { id: p.id, name: p.name, status: p.status, doctor_id: p.doctor_id })
      router.push("/patient")
    } else if (selectedRole === "doctor") {
      const d = doctors.find((x) => x.id === selectedId)
      if (!d) return
      setSession("doctor", { id: d.id, name: d.name, role: "doctor", specialization: d.specialization })
      router.push("/doctor")
    } else {
      const r = receptionists.find((x) => x.id === selectedId)
      if (!r) return
      setSession("receptionist", { id: r.id, name: r.name, role: "receptionist" })
      router.push("/reception")
    }
  }

  const identityOptions: { id: string; label: string }[] =
    selectedRole === "patient"
      ? patients.map((p) => ({ id: p.id, label: `${p.name}${p.status ? ` — ${p.status}` : ""}` }))
      : selectedRole === "doctor"
      ? doctors.map((d) => ({ id: d.id, label: `${d.name}${d.specialization ? ` (${d.specialization})` : ""}` }))
      : receptionists.map((r) => ({ id: r.id, label: r.name }))

  const roles: { key: RoleKey; label: string; description: string; icon: React.ElementType; color: string }[] = [
    {
      key: "receptionist",
      label: "Receptionist",
      description: "Register patients and assign them to doctors",
      icon: ClipboardList,
      color: "text-amber-600",
    },
    {
      key: "doctor",
      label: "Doctor",
      description: "Manage patients, prescribe exercises, and monitor progress",
      icon: Stethoscope,
      color: "text-primary",
    },
    {
      key: "patient",
      label: "Patient",
      description: "View your prescribed exercises, play games, and message your doctor",
      icon: Dumbbell,
      color: "text-accent",
    },
  ]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
          <Building2 className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">RehabAI</h1>
          <p className="text-sm text-muted-foreground">Hospital Rehabilitation System</p>
        </div>
      </div>

      <p className="mb-8 text-center text-muted-foreground">
        Select your role to continue
      </p>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {roles.map(({ key, label, description, icon: Icon, color }) => (
          <Card
            key={key}
            onClick={() => handleRoleCard(key)}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedRole === key
                ? "ring-2 ring-primary shadow-md"
                : "hover:border-primary/40"
            }`}
          >
            <CardHeader className="pb-2">
              <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-muted`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedRole && (
        <div className="mt-8 w-full max-w-sm space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Who are you?
            </label>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : identityOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No {selectedRole}s found. Add some via the backend first.
              </p>
            ) : (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${selectedRole}…`} />
                </SelectTrigger>
                <SelectContent>
                  {identityOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button
            className="w-full"
            disabled={!selectedId}
            onClick={handleEnter}
          >
            Enter as {selectedRole}
          </Button>
        </div>
      )}
    </div>
  )
}
