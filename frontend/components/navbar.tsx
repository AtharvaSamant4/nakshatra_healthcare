"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Dumbbell,
  Gamepad2,
  BarChart3,
  Menu,
  X,
  MessageSquare,
  Users,
  UserPlus,
  LogOut,
} from "lucide-react"
import { useState } from "react"
import { useApp } from "@/lib/app-context"

const PATIENT_NAV = [
  { name: "Dashboard", href: "/patient", icon: LayoutDashboard },
  { name: "Exercise", href: "/patient/exercise", icon: Dumbbell },
  { name: "Games", href: "/patient/games", icon: Gamepad2 },
  { name: "Results", href: "/results", icon: BarChart3 },
  { name: "Messages", href: "/patient/messages", icon: MessageSquare },
]

const DOCTOR_NAV = [
  { name: "My Patients", href: "/doctor", icon: Users },
]

const RECEPTIONIST_NAV = [
  { name: "Register Patient", href: "/reception", icon: UserPlus },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { role, identity, clearSession } = useApp()

  const navigation =
    role === "patient"
      ? PATIENT_NAV
      : role === "doctor"
      ? DOCTOR_NAV
      : role === "receptionist"
      ? RECEPTIONIST_NAV
      : []

  const initials = identity
    ? identity.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?"

  const roleLabel =
    role === "patient"
      ? "Patient"
      : role === "doctor"
      ? "Doctor"
      : role === "receptionist"
      ? "Reception"
      : null

  function handleSwitchRole() {
    clearSession()
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">RehabAI</span>
          </Link>

          {navigation.length > 0 && (
            <div className="hidden md:flex md:gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {role && (
            <>
              <div className="hidden sm:flex sm:flex-col sm:items-end">
                <p className="text-sm font-medium text-foreground leading-none">
                  {identity?.name ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{roleLabel}</p>
              </div>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={handleSwitchRole}
              >
                <LogOut className="h-4 w-4" />
                Switch Role
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-card md:hidden">
          <div className="space-y-1 px-4 py-3">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
            {role && (
              <button
                onClick={() => { setMobileMenuOpen(false); handleSwitchRole() }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Switch Role
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
