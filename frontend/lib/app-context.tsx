"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export type Role = "receptionist" | "doctor" | "patient" | null

export interface StaffIdentity {
  id: string
  name: string
  role: "doctor" | "receptionist"
  specialization?: string
}

export interface PatientIdentity {
  id: string
  name: string
  status?: string
  doctor_id?: string
}

export type Identity = StaffIdentity | PatientIdentity | null

interface AppContextValue {
  role: Role
  identity: Identity
  /** Backward-compat: equals identity.id when role === "patient", else null */
  selectedUserId: string | null
  /** True after sessionStorage has been read (avoids child effects running before restore). */
  sessionRestored: boolean
  setSession: (role: Role, identity: Identity) => void
  clearSession: () => void
}

const AppContext = createContext<AppContextValue>({
  role: null,
  identity: null,
  selectedUserId: null,
  sessionRestored: false,
  setSession: () => {},
  clearSession: () => {},
})

const STORAGE_KEY = "rehab_v2_session"

import { supabase } from "./supabase"
export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null)
  const [identity, setIdentity] = useState<Identity>(null)
  const [sessionRestored, setSessionRestored] = useState(false)

  useEffect(() => {
    const demoUser = localStorage.getItem("demo_user")
    if (demoUser) {
      try {
        const parsed = JSON.parse(demoUser)
        if (parsed.isDemo) {
          setRole(parsed.role)
          setIdentity({
            id: parsed.id,
            name: parsed.name,
            role: parsed.role,
          } as Identity)
          setSessionRestored(true)
          return
        }
      } catch (e) {
        // ignore JSON parse err
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user.user_metadata) {
        setRole(session.user.user_metadata.role as Role)
        setIdentity({
          id: session.user.user_metadata.id,
          name: session.user.user_metadata.name,
          role: session.user.user_metadata.role
        } as Identity)
      }
      setSessionRestored(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setRole(null)
        setIdentity(null)
      } else if (session && session.user.user_metadata) {
        setRole(session.user.user_metadata.role as Role)
        setIdentity({
          id: session.user.user_metadata.id,
          name: session.user.user_metadata.name,
          role: session.user.user_metadata.role
        } as Identity)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const setSession = (r: Role, i: Identity) => {
    setRole(r)
    setIdentity(i)
  }

  const clearSession = async () => {
    localStorage.removeItem("demo_user")
    await supabase.auth.signOut()
    setRole(null)
    setIdentity(null)
  }

  const selectedUserId = role === "patient" && identity ? identity.id : null

  return (
    <AppContext.Provider
      value={{ role, identity, selectedUserId, sessionRestored, setSession, clearSession }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}

