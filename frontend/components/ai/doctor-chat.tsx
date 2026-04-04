"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { aiApi, type AIChatMessage, type ReportJson } from "@/lib/api"
import { Brain, Send, User, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface DoctorChatProps {
  doctorId: string
  patientId: string
  patientName: string
  /** Latest report — passed in so we can show risk badge without extra fetch */
  latestReport?: ReportJson | null
}

const RISK_COLORS: Record<string, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low:    "bg-green-100 text-green-700",
}

export function DoctorChat({ doctorId, patientId, patientName, latestReport }: DoctorChatProps) {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: "assistant",
      content: `I have full context on ${patientName}. Ask me about their progress, risk indicators, prescription adjustments, or anything else relevant to their care.`,
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    setMessages((prev) => [...prev, { role: "user", content: text }])
    setInput("")
    setLoading(true)

    try {
      const { response } = await aiApi.doctorChat(doctorId, patientId, text)
      setMessages((prev) => [...prev, { role: "assistant", content: response }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again." },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const risk = latestReport?.risk_level

  return (
    <Card className="flex flex-col h-[520px]">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            Clinical AI Assistant
          </CardTitle>
          {risk && (
            <Badge
              variant="secondary"
              className={cn("flex items-center gap-1 text-xs", RISK_COLORS[risk] ?? "bg-muted")}
            >
              {risk === "high" && <AlertTriangle className="h-3 w-3" />}
              {risk} risk
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2 items-start",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary"
              )}
            >
              {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Brain className="h-3.5 w-3.5" />}
            </div>
            <div
              className={cn(
                "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 items-start">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Brain className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-3.5 py-2.5">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </CardContent>

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <Input
          placeholder="Ask about this patient…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="flex-1"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
