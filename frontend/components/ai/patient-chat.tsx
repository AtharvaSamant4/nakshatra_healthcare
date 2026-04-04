"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { aiApi, type AIChatMessage } from "@/lib/api"
import { Sparkles, Send, User, X, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface PatientChatProps {
  patientId: string
}

const WELCOME: AIChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm your AI rehabilitation therapist. I can answer questions about your recovery, explain your exercises, or just check in on how you're feeling. What's on your mind?",
}

export function PatientChat({ patientId }: PatientChatProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AIChatMessage[]>([WELCOME])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
    }
  }, [open, messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: AIChatMessage = { role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const { response } = await aiApi.patientChat(patientId, text)
      setMessages((prev) => [...prev, { role: "assistant", content: response }])
      if (!open) setUnread((n) => n + 1)
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't connect right now. Please try again in a moment.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function renderMarkdown(text: string) {
    const lines = text.split("\n")
    const elements: React.ReactNode[] = []
    let key = 0

    for (const line of lines) {
      if (!line.trim()) {
        elements.push(<div key={key++} className="h-2" />)
        continue
      }

      if (/^[\*\-]\s+/.test(line)) {
        const content = line.replace(/^[\*\-]\s+/, "")
        elements.push(
          <div key={key++} className="flex gap-2 items-start">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
            <span>{inlineParse(content)}</span>
          </div>
        )
        continue
      }

      elements.push(<p key={key++}>{inlineParse(line)}</p>)
    }

    return elements
  }

  function inlineParse(text: string): React.ReactNode[] {
    const parts = text.split(/(\*\*[^*]+\*\*)/)
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating chat panel */}
      <div
        className={cn(
          "fixed bottom-20 right-5 z-50 flex flex-col w-[360px] rounded-2xl shadow-2xl border border-border bg-background overflow-hidden transition-all duration-300",
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        style={{ maxHeight: "520px", height: "520px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">AI Therapist</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-primary-foreground hover:bg-white/20"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary"
                )}
              >
                {msg.role === "user" ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed space-y-1",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                )}
              >
                {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 items-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
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
        </div>

        {/* Input */}
        <div className="p-3 border-t flex gap-2 shrink-0">
          <Input
            placeholder="Ask your therapist…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="flex-1 text-sm"
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
      </div>

      {/* FAB toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label="Open AI Therapist chat"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <span className="relative">
            <MessageCircle className="h-6 w-6" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </span>
        )}
      </button>
    </>
  )
}
