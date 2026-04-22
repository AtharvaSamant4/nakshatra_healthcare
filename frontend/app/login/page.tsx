"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/lib/app-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building2, KeyRound, Mail } from "lucide-react"

export default function LoginPage() {
  const { setSession } = useApp()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Demo login bypass
      const isDemo = email === "drsmoke@test.local" || email === "aarav@gmail.com" || email === "receptionist@test.local"
      
      if (isDemo) {
        let role = "patient"
        let id = ""
        let name = ""

        if (email === "drsmoke@test.local") {
          role = "doctor"
          id = "e4034668-b884-4334-aac2-dd0bd7083ee3"
          name = "Dr. Smoke"
        } else if (email === "aarav@gmail.com") {
          role = "patient"
          id = "11111111-1111-4111-8111-111111111111"
          name = "Aarav Sharma"
        } else if (email === "receptionist@test.local") {
          role = "receptionist"
          id = "d9af8818-4201-4a5a-824d-6e8d94bc6502"
          name = "Receptionist Anita"
        }

        const demoSession = { email, role, isDemo: true, id, name }
        localStorage.setItem("demo_user", JSON.stringify(demoSession))

        if (role === "patient") {
          setSession("patient", { id, name, status: "active" })
          router.push("/patient")
        } else if (role === "doctor") {
          setSession("doctor", { id, name, role: "doctor" })
          router.push("/doctor")
        } else {
          setSession("receptionist", { id, name, role: "receptionist" })
          router.push("/reception")
        }
        return
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      if (!data.session?.user.user_metadata) {
        throw new Error("User metadata missing")
      }

      const role = data.session.user.user_metadata.role
      const id = data.session.user.user_metadata.id
      const name = data.session.user.user_metadata.name

      // Navigation is now handled by the global listener in app-context, 
      // but we force a quick router push for immediate UX speed.
      if (role === "patient") {
        setSession("patient", { id, name, status: "active" })
        router.push("/patient")
      } else if (role === "doctor") {
        setSession("doctor", { id, name, role: "doctor" })
        router.push("/doctor")
      } else {
        setSession("receptionist", { id, name, role: "receptionist" })
        router.push("/reception")
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

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

      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-1 align-center">
          <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 items-center top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none" htmlFor="password">
                  Password
                </label>
                <a href="#" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 items-center top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded bg-destructive/15 p-3 text-sm text-destructive font-medium border border-destructive/30">
                {error}
              </div>
            )}

            <Button className="w-full mt-6" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Demo Credentials</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-muted-foreground">
              <p> <b>Doctor:</b> drsmoke@test.local / any</p>
              <p> <b>Patient:</b> aarav@gmail.com / any</p>
              <p> <b>Receptionist:</b> receptionist@test.local / any</p>
              <p className="mt-2 text-primary/80 italic">Any password will work for demo</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
