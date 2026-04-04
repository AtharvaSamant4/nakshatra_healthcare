"use client"

import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface WebcamFeedProps {
  isActive: boolean
  className?: string
}

export function WebcamFeed({ isActive, className }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 1280, height: 720 },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setHasPermission(true)
        }
      } catch (err) {
        console.error("Error accessing camera:", err)
        setHasPermission(false)
        setError("Camera access denied. Please enable camera permissions.")
      }
    }

    if (isActive) {
      startCamera()
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isActive])

  // Simulate pose detection overlay
  useEffect(() => {
    if (!isActive || !canvasRef.current || !videoRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const drawPoseOverlay = () => {
      if (!videoRef.current || !canvas) return
      
      canvas.width = videoRef.current.videoWidth || 640
      canvas.height = videoRef.current.videoHeight || 480

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Simulated pose landmarks (for demo purposes)
      ctx.strokeStyle = "oklch(0.65 0.18 165)"
      ctx.lineWidth = 3
      ctx.lineCap = "round"

      // Draw simulated skeleton lines
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      // Head
      ctx.beginPath()
      ctx.arc(centerX, centerY - 120, 25, 0, Math.PI * 2)
      ctx.stroke()

      // Shoulders
      ctx.beginPath()
      ctx.moveTo(centerX - 80, centerY - 60)
      ctx.lineTo(centerX + 80, centerY - 60)
      ctx.stroke()

      // Spine
      ctx.beginPath()
      ctx.moveTo(centerX, centerY - 60)
      ctx.lineTo(centerX, centerY + 60)
      ctx.stroke()

      // Arms
      ctx.beginPath()
      ctx.moveTo(centerX - 80, centerY - 60)
      ctx.lineTo(centerX - 120, centerY + 20)
      ctx.lineTo(centerX - 100, centerY + 80)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(centerX + 80, centerY - 60)
      ctx.lineTo(centerX + 120, centerY + 20)
      ctx.lineTo(centerX + 100, centerY + 80)
      ctx.stroke()

      // Draw joint points
      const joints = [
        [centerX, centerY - 120], // head
        [centerX - 80, centerY - 60], // left shoulder
        [centerX + 80, centerY - 60], // right shoulder
        [centerX - 120, centerY + 20], // left elbow
        [centerX + 120, centerY + 20], // right elbow
        [centerX - 100, centerY + 80], // left hand
        [centerX + 100, centerY + 80], // right hand
      ]

      joints.forEach(([x, y]) => {
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.fillStyle = "oklch(0.55 0.15 200)"
        ctx.fill()
        ctx.stroke()
      })
    }

    const interval = setInterval(drawPoseOverlay, 100)
    return () => clearInterval(interval)
  }, [isActive])

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-foreground/5",
        className
      )}
    >
      {isActive ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />
          {hasPermission === false && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
              <p className="text-center text-muted-foreground px-4">{error}</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-10 w-10 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-foreground">Camera Ready</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Press Start to begin your session
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
