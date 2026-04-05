"use client"

import { use, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { messagesApi, type Message } from "@/lib/api"
import { useApp } from "@/lib/app-context"
import { Send, MessageSquare, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function DoctorPatientMessagesPage({
  params,
}: {
  params: Promise<{ patientId: string }>
}) {
  const { patientId } = use(params)
  const { identity, role } = useApp()
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (role !== "doctor") {
      router.replace("/login")
      return
    }
  }, [role, router])

  const loadMessages = () => {
    if (!patientId) return
    messagesApi
      .getThread(patientId)
      .then((thread) => setMessages(thread.messages))
      .catch(console.error)
  }

  useEffect(() => {
    setLoading(true)
    loadMessages()
    setLoading(false)

    const interval = setInterval(loadMessages, 10_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    const text = content.trim()
    if (!text || !patientId || !identity) return
    setSending(true)
    try {
      await messagesApi.send({
        patient_id: patientId,
        sender_type: "doctor",
        sender_id: identity.id,
        content: text,
      })
      setContent("")
      loadMessages()
    } catch (err) {
      console.error("Failed to send message:", err)
    } finally {
      setSending(false)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/doctor/${patientId}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Patient
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Patient Messages</h1>
          <p className="mt-1 text-muted-foreground">Message thread with your patient</p>
        </div>

        <Card className="flex flex-col" style={{ height: "60vh" }}>
          <CardHeader className="border-b pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Message Thread</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No messages yet. Send a message to your patient below.
              </p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_type === "doctor"
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {!isMe && (
                        <p className="mb-0.5 text-xs font-medium opacity-70">
                          {msg.sender_name ?? "Patient"}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <p
                        className={`mt-1 text-xs ${
                          isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message to your patient…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={sending || !content.trim()}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}


