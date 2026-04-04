"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/lib/app-context"

export function AuthGuard({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { role } = useApp()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      if (!role) {
        router.push("/login")
      } else if (!allowedRoles.includes(role)) {
        if (role === "doctor") router.push("/doctor")
        if (role === "patient") router.push("/patient")
        if (role === "receptionist") router.push("/reception")
      }
    }
  }, [role, router, allowedRoles, mounted])

  if (!mounted || !role || !allowedRoles.includes(role)) {
    return <div className="h-screen w-screen flex items-center justify-center p-4">Loading application context...</div>
  }

  return <>{children}</>
}
