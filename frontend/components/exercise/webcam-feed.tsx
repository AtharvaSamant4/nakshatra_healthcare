"use client"

import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useShoulderFlexionCounter, type Landmark, type MovementState } from "@/hooks/use-shoulder-flexion-counter"

interface WebcamFeedProps {
  isActive: boolean
  className?: string
  onMetricsChange?: (metrics: {
    repCount: number
    currentAngle: number
    currentState: MovementState
    formQuality: "good" | "bad" | "neutral"
    activeSide: "left" | "right"
    calibrated: boolean
    upThreshold: number
    downThreshold: number
  }) => void
}

declare global {
  interface Window {
    Pose?: new (opts: { locateFile: (file: string) => string }) => {
      setOptions: (opts: Record<string, unknown>) => void
      onResults: (cb: (results: { poseLandmarks?: Landmark[] }) => void) => void
      send: (payload: { image: HTMLVideoElement }) => Promise<void>
      close?: () => void
    }
    Camera?: new (
      video: HTMLVideoElement,
      opts: { onFrame: () => Promise<void>; width: number; height: number }
    ) => { start: () => void; stop?: () => void }
    drawConnectors?: (
      ctx: CanvasRenderingContext2D,
      landmarks: Landmark[],
      connections: unknown,
      style: Record<string, unknown>
    ) => void
    drawLandmarks?: (
      ctx: CanvasRenderingContext2D,
      landmarks: Landmark[],
      style: Record<string, unknown>
    ) => void
    POSE_CONNECTIONS?: unknown
  }
}

async function loadScript(src: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(script)
  })
}

export function WebcamFeed({ isActive, className, onMetricsChange }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { output, processFrame, resetCounter } = useShoulderFlexionCounter()

  useEffect(() => {
    if (!isActive) {
      resetCounter()
    }
  }, [isActive, resetCounter])

  useEffect(() => {
    let stream: MediaStream | null = null
    let poseInstance: { close?: () => void } | null = null
    let cameraInstance: { stop?: () => void } | null = null
    let disposed = false

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 1280, height: 720 },
        })
        const videoEl = videoRef.current
        if (videoEl) {
          videoEl.srcObject = stream
          await videoEl.play().catch(() => undefined)
          setHasPermission(true)

          await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js")
          await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js")
          await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js")

          if (disposed || !window.Pose || !window.Camera) return

          const pose = new window.Pose({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
          })

          pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          })

          pose.onResults((results: { poseLandmarks?: Landmark[] }) => {
            const canvas = canvasRef.current
            const ctx = canvas?.getContext("2d")
            const activeVideo = videoRef.current

            if (!canvas || !ctx || !activeVideo) return

            canvas.width = activeVideo.videoWidth || 640
            canvas.height = activeVideo.videoHeight || 480
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            if (!results.poseLandmarks) return

            const frameOutput = processFrame(results.poseLandmarks)

            if (frameOutput && onMetricsChange) {
              const formQuality: "good" | "bad" | "neutral" =
                frameOutput.currentState === "UP" && frameOutput.currentAngle > frameOutput.debug.upThreshold - 5
                  ? "good"
                  : frameOutput.currentAngle < frameOutput.debug.downThreshold
                  ? "neutral"
                  : "bad"

              onMetricsChange({
                repCount: frameOutput.repCount,
                currentAngle: frameOutput.currentAngle,
                currentState: frameOutput.currentState,
                formQuality,
                activeSide: frameOutput.debug.activeSide,
                calibrated: frameOutput.debug.calibrated,
                upThreshold: frameOutput.debug.upThreshold,
                downThreshold: frameOutput.debug.downThreshold,
              })
            }

            if (window.drawConnectors && window.POSE_CONNECTIONS) {
              window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
                color: "#00e29f",
                lineWidth: 3,
              })
            }
            if (window.drawLandmarks) {
              window.drawLandmarks(ctx, results.poseLandmarks, {
                color: "#00b7ff",
                lineWidth: 1,
                radius: 3,
              })
            }
          })

          const camera = new window.Camera(videoEl, {
            onFrame: async () => {
              await pose.send({ image: videoEl })
            },
            width: 1280,
            height: 720,
          })

          camera.start()
          poseInstance = pose
          cameraInstance = camera
        }
      } catch (err) {
        console.error("Error accessing camera:", err)
        setHasPermission(false)
        setError("Camera or pose model unavailable. Please enable camera permissions and check your network.")
      }
    }

    if (isActive) {
      startCamera()
    }

    return () => {
      disposed = true
      if (cameraInstance?.stop) cameraInstance.stop()
      if (poseInstance?.close) poseInstance.close()
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isActive, onMetricsChange, processFrame])

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
