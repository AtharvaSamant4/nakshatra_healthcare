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

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null)
  const [identity, setIdentity] = useState<Identity>(null)
  const [sessionRestored, setSessionRestored] = useState(false)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { role: r, identity: i } = JSON.parse(saved)
        setRole(r)
        setIdentity(i)
      }
    } catch {
      // sessionStorage unavailable — proceed without restore
    } finally {
      setSessionRestored(true)
    }
  }, [])

  const setSession = (r: Role, i: Identity) => {
    setRole(r)
    setIdentity(i)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ role: r, identity: i }))
    } catch {}
  }

  const clearSession = () => {
    setRole(null)
    setIdentity(null)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {}
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
