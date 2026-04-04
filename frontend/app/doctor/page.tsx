"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { patientsApi, type PatientListItem } from "@/lib/api"
import { useApp } from "@/lib/app-context"
import { Users, Search, ChevronRight } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  registered: "bg-muted text-muted-foreground",
  evaluated: "bg-blue-100 text-blue-700",
  in_treatment: "bg-green-100 text-green-700",
  discharged: "bg-gray-100 text-gray-500",
}

export default function DoctorDashboard() {
  const { identity, role } = useApp()
  const router = useRouter()

  const [allPatients, setAllPatients] = useState<PatientListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  const currentDoctorId = identity?.id ?? ""

  useEffect(() => {
    if (role !== "doctor") {
      router.replace("/login")
      return
    }
    setLoading(true)
    patientsApi
      .list()
      .then((patients) => {
        setAllPatients(patients)
        const filteredPatients = patients.filter(
          (p) => p.doctor_id === currentDoctorId
        )
        console.log({
          doctorId: currentDoctorId,
          totalPatients: patients.length,
          filtered: filteredPatients.length,
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [role, identity, router, currentDoctorId])

  const displayPatients = useMemo(() => {
    const filteredPatients = allPatients.filter(
      (p) => p.doctor_id === currentDoctorId
    )
    return filteredPatients.length > 0 ? filteredPatients : allPatients
  }, [allPatients, currentDoctorId])

  const filtered = displayPatients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              My Patients
            </h1>
            <p className="mt-1 text-muted-foreground">
              Dr. {identity?.name} · {displayPatients.length} patient
              {displayPatients.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          {(["registered", "evaluated", "in_treatment", "discharged"] as const).map((status) => {
            const count = displayPatients.filter((p) => p.status === status).length
            return (
              <Card key={status}>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {status.replace("_", " ")}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Patient List</CardTitle>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search patients…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {search ? "No patients match your search." : "No patients assigned yet."}
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.map((patient) => (
                  <Link
                    key={patient.id}
                    href={`/doctor/${patient.id}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/60"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
                        {patient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{patient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {[patient.injury_type, patient.severity]
                            .filter(Boolean)
                            .map((s) => s && s.charAt(0).toUpperCase() + s.slice(1))
                            .join(" · ") || "No diagnosis yet"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {patient.has_alert && (
                        <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">
                          High Risk Alert
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[patient.status ?? ""] ?? "bg-muted text-muted-foreground"}
                      >
                        {(patient.status ?? "unknown").replace("_", " ")}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
