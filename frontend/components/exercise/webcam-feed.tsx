"use client"

import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  createShoulderFlexionCounter,
  type CounterOutput,
  type PoseLandmark,
} from "@/hooks/use-shoulder-flexion-counter"

// CDN URLs for MediaPipe Pose (UMD bundles, no bundler needed).
const MP_POSE_URL    = "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"
const MP_DRAWING_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
const MP_CAMERA_URL  = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"

interface WebcamFeedProps {
  isActive: boolean
  className?: string
  onMetricsChange?: (output: CounterOutput) => void
}

// ─── Script loader (idempotent) ───────────────────────────────────────────────
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement("script")
    s.src = src
    s.crossOrigin = "anonymous"
    s.onload  = () => resolve()
    s.onerror = () => reject(new Error(`Script failed: ${src}`))
    document.head.appendChild(s)
  })
}

// ─── Canvas skeleton draw ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawSkeleton(results: any, ctx: CanvasRenderingContext2D): void {
  if (!results.poseLandmarks) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any
  if (win.drawConnectors && win.POSE_CONNECTIONS) {
    win.drawConnectors(ctx, results.poseLandmarks, win.POSE_CONNECTIONS, {
      color: "oklch(0.65 0.18 165)",
      lineWidth: 2,
    })
  }
  if (win.drawLandmarks) {
    win.drawLandmarks(ctx, results.poseLandmarks, {
      color: "oklch(0.55 0.15 200)",
      lineWidth: 1,
      radius: 4,
    })
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function WebcamFeed({ isActive, className, onMetricsChange }: WebcamFeedProps) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poseRef   = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cameraRef = useRef<any>(null)

  // Counter instance lives in a ref — never recreated across renders.
  const counterRef = useRef(createShoulderFlexionCounter())

  // Keep the latest callback in a ref so the pose results handler (which is
  // created once inside the effect and never recreated) always calls the
  // current version without needing to be in the effect dependency array.
  const onMetricsRef = useRef(onMetricsChange)
  onMetricsRef.current = onMetricsChange

  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [poseReady, setPoseReady] = useState(false)

  useEffect(() => {
    if (!isActive) return

    // Reset the counter synchronously the moment the session starts —
    // before any async camera/script work. This guarantees no leftover
    // state from a previous session can increment the count.
    counterRef.current.reset()

    let cancelled = false

    // ── Pose results handler ─────────────────────────────────────────────────
    // Defined inside the effect so it closes over refs but is NOT in the dep
    // array — this prevents the entire pipeline from tearing down on every render.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onPoseResults(results: any) {
      const canvas = canvasRef.current
      const video  = videoRef.current
      if (!canvas || !video || cancelled) return

      // Match canvas size to video.
      const w = video.videoWidth  || 640
      const h = video.videoHeight || 480
      if (canvas.width !== w)  canvas.width  = w
      if (canvas.height !== h) canvas.height = h

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawSkeleton(results, ctx)

      if (results.poseLandmarks) {
        const landmarks: PoseLandmark[] = results.poseLandmarks.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (lm: any) => ({ x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility ?? 0 })
        )
        const output = counterRef.current.processFrame(landmarks, performance.now())
        onMetricsRef.current?.(output)
      }
    }

    async function start() {
      // ── 1. Camera permission ──────────────────────────────────────────────
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setHasPermission(true)
        }
      } catch {
        setHasPermission(false)
        setCameraError("Camera access denied. Please enable camera permissions.")
        return
      }

      // ── 2. Load MediaPipe CDN scripts ────────────────────────────────────
      try {
        await Promise.all([
          loadScript(MP_POSE_URL),
          loadScript(MP_DRAWING_URL),
          loadScript(MP_CAMERA_URL),
        ])
      } catch (e) {
        console.warn("MediaPipe CDN unavailable:", e)
        // Camera is already running — just no pose overlay or real counting.
        return
      }

      if (cancelled) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any
      if (!win.Pose || !win.Camera) {
        console.warn("MediaPipe globals not found after script load.")
        return
      }

      // ── 3. Initialise Pose ───────────────────────────────────────────────
      const pose = new win.Pose({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      })
      pose.setOptions({
        modelComplexity:       1,
        smoothLandmarks:       true,
        enableSegmentation:    false,
        smoothSegmentation:    false,
        minDetectionConfidence: 0.7,
        minTrackingConfidence:  0.7,
      })
      pose.onResults(onPoseResults)
      poseRef.current = pose

      // ── 4. Start Camera loop ─────────────────────────────────────────────
      const camera = new win.Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current && videoRef.current && !cancelled) {
            await poseRef.current.send({ image: videoRef.current })
          }
        },
        width:  1280,
        height: 720,
      })
      cameraRef.current = camera
      await camera.start()
      if (!cancelled) setPoseReady(true)
    }

    start()

    return () => {
      cancelled = true
      cameraRef.current?.stop?.()
      cameraRef.current = null
      poseRef.current?.close?.()
      poseRef.current = null
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      setPoseReady(false)
    }
    // Only re-run when isActive changes. All callbacks are stable via refs.
  }, [isActive])

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-foreground/5", className)}>
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

          {/* Pose model loading overlay */}
          {!poseReady && hasPermission === true && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <p className="text-sm font-medium text-muted-foreground">
                Loading pose model…
              </p>
            </div>
          )}

          {/* Camera permission denied */}
          {hasPermission === false && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
              <p className="text-center text-sm text-muted-foreground px-6">
                {cameraError}
              </p>
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
