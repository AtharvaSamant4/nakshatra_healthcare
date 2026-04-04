"use client"
import { AuthGuard } from "@/components/auth-guard"

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["receptionist"]}>{children}</AuthGuard>
}
