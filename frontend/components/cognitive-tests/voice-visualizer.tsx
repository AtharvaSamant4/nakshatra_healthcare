"use client"

import { cn } from "@/lib/utils"
import { Mic, MicOff } from "lucide-react"

interface VoiceVisualizerProps {
  isRecording: boolean
  isProcessing?: boolean
  audioLevel?: number // 0-1
  className?: string
  size?: "sm" | "md" | "lg"
}

export function VoiceVisualizer({
  isRecording,
  isProcessing = false,
  audioLevel = 0,
  className,
  size = "md",
}: VoiceVisualizerProps) {
  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-20 w-20",
    lg: "h-28 w-28",
  }

  const iconSizes = {
    sm: "h-5 w-5",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Pulse rings */}
      {isRecording && (
        <>
          <div
            className="absolute rounded-full bg-red-500/20 animate-ping"
            style={{
              width: `${100 + audioLevel * 60}%`,
              height: `${100 + audioLevel * 60}%`,
              animationDuration: "1.5s",
            }}
          />
          <div
            className="absolute rounded-full bg-red-500/10 animate-ping"
            style={{
              width: `${120 + audioLevel * 80}%`,
              height: `${120 + audioLevel * 80}%`,
              animationDuration: "2s",
              animationDelay: "0.3s",
            }}
          />
          <div
            className="absolute rounded-full bg-red-500/5 animate-ping"
            style={{
              width: `${140 + audioLevel * 100}%`,
              height: `${140 + audioLevel * 100}%`,
              animationDuration: "2.5s",
              animationDelay: "0.6s",
            }}
          />
        </>
      )}

      {/* Processing spinner */}
      {isProcessing && (
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      )}

      {/* Main circle */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full transition-all duration-300",
          sizeClasses[size],
          isRecording
            ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
            : isProcessing
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
        style={
          isRecording
            ? { transform: `scale(${1 + audioLevel * 0.15})` }
            : undefined
        }
      >
        {isRecording ? (
          <Mic className={cn(iconSizes[size], "animate-pulse")} />
        ) : (
          <MicOff className={iconSizes[size]} />
        )}
      </div>

      {/* Status label */}
      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span
          className={cn(
            "text-xs font-medium",
            isRecording
              ? "text-red-500"
              : isProcessing
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          {isRecording ? "Listening..." : isProcessing ? "Processing..." : "Ready"}
        </span>
      </div>
    </div>
  )
}

// ─── Waveform bars (alternative visual) ─────────────────────────────────────

interface WaveformBarsProps {
  isActive: boolean
  barCount?: number
  className?: string
}

export function WaveformBars({ isActive, barCount = 5, className }: WaveformBarsProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all duration-150",
            isActive ? "bg-red-500" : "bg-muted-foreground/30"
          )}
          style={{
            height: isActive ? `${12 + Math.random() * 20}px` : "6px",
            animationName: isActive ? "waveform" : "none",
            animationDuration: `${0.4 + i * 0.1}s`,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationDirection: "alternate",
          }}
        />
      ))}
      <style jsx>{`
        @keyframes waveform {
          0% { height: 6px; }
          100% { height: 28px; }
        }
      `}</style>
    </div>
  )
}
