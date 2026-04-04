"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { usersApi, type UserListItem } from "@/lib/api"

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
    usersApi.list()
      .then((data) => {
        setUsers(data)
        // Auto-select the first user if none chosen yet
        if (data.length > 0) setSelectedUserId(data[0].id)
      })
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

export function useUser() {
  return useContext(UserContext)
}
