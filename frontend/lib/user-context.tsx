"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { usersApi, patientsApi, type UserListItem } from "@/lib/api"
import { useApp } from "@/lib/app-context"

interface UserContextValue {
  users: UserListItem[]
  selectedUserId: string | null
  selectedUser: UserListItem | null
  setSelectedUserId: (id: string) => void
  loading: boolean
}

const UserContext = createContext<UserContextValue>({
  users: [],
  selectedUserId: null,
  selectedUser: null,
  setSelectedUserId: () => {},
  loading: true,
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Try legacy users table; fall back to patients if table doesn't exist
    usersApi.list()
      .then((data) => {
        if (data.length > 0) {
          setUsers(data)
          setSelectedUserId(data[0].id)
        } else {
          return Promise.reject(new Error("empty"))
        }
      })
      .catch(() =>
        patientsApi.list()
          .then((pts) => {
            const mapped: UserListItem[] = pts.map((p) => ({
              id: p.id,
              name: p.name,
              created_at: "",
            }))
            setUsers(mapped)
            if (mapped.length > 0) setSelectedUserId(mapped[0].id)
          })
      )
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null

  return (
    <UserContext.Provider value={{ users, selectedUserId, selectedUser, setSelectedUserId, loading }}>
      {children}
    </UserContext.Provider>
  )
}

/**
 * useUser — bridges the legacy UserContext with the V2 AppContext.
 * Exercise and Games pages use this hook. When a patient is logged in via
 * AppContext (V2 flow), we use that selectedUserId so session saves work.
 */
export function useUser() {
  const legacy = useContext(UserContext)
  const app = useApp()
  // V2 app context has a patient logged in — use that ID
  if (app.selectedUserId) {
    return { ...legacy, selectedUserId: app.selectedUserId }
  }
  return legacy
}
