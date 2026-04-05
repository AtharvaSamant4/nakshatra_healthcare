"use client"

import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  useExerciseCounter,
  type ExerciseAngleConfig,
  type Landmark,
  type MovementState,
} from "@/hooks/use-shoulder-flexion-counter"

interface WebcamFeedProps {
  isActive: boolean
  showDemo?: boolean
  demoSecondsRemaining?: number
  demoExerciseName?: string
  demoInstructions?: string
  angleConfig?: ExerciseAngleConfig
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

export function WebcamFeed({
  isActive,
  showDemo = false,
  demoSecondsRemaining = 0,
  demoExerciseName,
  demoInstructions,
  angleConfig,
  className,
  onMetricsChange,
}: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const metricsChangeRef = useRef(onMetricsChange)
  const [demoTick, setDemoTick] = useState(0)
  const [lastTrackedAt, setLastTrackedAt] = useState(0)
  // Use a ref so rep increments don't trigger camera/pose teardown
  const lastRepCountRef = useRef(0)
  const [returnStepPulseUntil, setReturnStepPulseUntil] = useState(0)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { output, processFrame, resetCounter } = useExerciseCounter({ angleConfig })
  /** Latest frame processor — kept in a ref so the MediaPipe effect does not re-run when this identity changes. */
  const processFrameRef = useRef(processFrame)
  processFrameRef.current = processFrame

  useEffect(() => {
    metricsChangeRef.current = onMetricsChange
  }, [onMetricsChange])

  useEffect(() => {
    if (!isActive) {
      resetCounter()
      setLastTrackedAt(0)
      lastRepCountRef.current = 0
      setReturnStepPulseUntil(0)
    }
  }, [isActive, resetCounter])

  useEffect(() => {
    resetCounter()
    setLastTrackedAt(0)
    lastRepCountRef.current = 0
    setReturnStepPulseUntil(0)
  }, [angleConfig, resetCounter])

  useEffect(() => {
    if (!showDemo) {
      setDemoTick(0)
      return
    }

    const timer = setInterval(() => {
      setDemoTick((prev) => prev + 1)
    }, 80)

    return () => clearInterval(timer)
  }, [showDemo])

  useEffect(() => {
    let stream: MediaStream | null = null
    let poseInstance: { close?: () => void } | null = null
    let cameraInstance: { stop?: () => void } | null = null
    let disposed = false
    let closeDelayTimer: ReturnType<typeof setTimeout> | null = null

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
            if (disposed) return

            const canvas = canvasRef.current
            const ctx = canvas?.getContext("2d")
            const activeVideo = videoRef.current

            if (!canvas || !ctx || !activeVideo) return

            const nextWidth = activeVideo.videoWidth || 640
            const nextHeight = activeVideo.videoHeight || 480
            if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
              canvas.width = nextWidth
              canvas.height = nextHeight
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            if (!results.poseLandmarks) return

            const frameOutput = processFrameRef.current(results.poseLandmarks)

            if (frameOutput && metricsChangeRef.current) {
              setLastTrackedAt(Date.now())
              if (frameOutput.repCount > lastRepCountRef.current) {
                setReturnStepPulseUntil(Date.now() + 1200)
                lastRepCountRef.current = frameOutput.repCount
              }

              const formQuality: "good" | "bad" | "neutral" =
                frameOutput.debug.postureScore >= 80
                  ? "good"
                  : frameOutput.debug.postureScore >= 45
                  ? "neutral"
                  : "bad"

              metricsChangeRef.current({
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
              if (disposed) return
              try {
                await pose.send({ image: videoEl })
              } catch {
                // Pose WASM may be closing — ignore (common race on stop)
              }
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

    if (isActive && !showDemo) {
      startCamera()
    }

    return () => {
      disposed = true
      try {
        cameraInstance?.stop?.()
      } catch {
        /* ignore */
      }
      cameraInstance = null

      const poseToClose = poseInstance
      const mediaStream = stream
      poseInstance = null
      stream = null

      if (closeDelayTimer) clearTimeout(closeDelayTimer)
      // Let in-flight onFrame / pose.send finish before closing WASM graph
      closeDelayTimer = setTimeout(() => {
        closeDelayTimer = null
        try {
          poseToClose?.close?.()
        } catch {
          /* ignore */
        }
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop())
        }
      }, 120)
    }
  }, [isActive, showDemo])

  const poseDetected = isActive && Date.now() - lastTrackedAt < 900
  const targetReached = output.debug.targetReached
  const returnedToStart = output.debug.startReached || Date.now() < returnStepPulseUntil
  const postureScore = output.debug.postureScore
  const leftRepCount = output.debug.leftRepCount
  const rightRepCount = output.debug.rightRepCount
  const leftPostureScore = output.debug.leftPostureScore
  const rightPostureScore = output.debug.rightPostureScore

  const demoPhase = (Math.sin(demoTick / 5) + 1) / 2
  const demoName = (demoExerciseName ?? "").toLowerCase()

  const getPose = (phase: number) => {
    const pose = {
      leftShoulderAngle: -18,
      rightShoulderAngle: 18,
      leftElbowAngle: 8,
      rightElbowAngle: -8,
      leftHipAngle: 8,
      rightHipAngle: -8,
      leftKneeAngle: 4,
      rightKneeAngle: -4,
      modelTransform: "",
      movementCue: "Raise both arms smoothly to target, then return slowly.",
      startLabel: "Start: neutral",
      targetLabel: "Target: controlled range",
      focusJointLabel: "Focus joint: shoulder",
      fixedCue: "Keep fixed: trunk stable",
      upperArmLocked: false,
      forearmLocked: false,
      legLocked: false,
    }

    if (demoName.includes("shoulder abduction")) {
      pose.leftShoulderAngle = -30 - phase * 60
      pose.rightShoulderAngle = 30 + phase * 60
      pose.leftElbowAngle = 4
      pose.rightElbowAngle = -4
      pose.movementCue = "Lift arms to the sides up to shoulder level."
      pose.startLabel = "Start: arms at side"
      pose.targetLabel = "Target: T-shape arms"
      pose.fixedCue = "Keep fixed: elbows mostly straight, no trunk lean"
      pose.forearmLocked = true
    } else if (demoName.includes("shoulder external rotation")) {
      pose.leftShoulderAngle = -90
      pose.rightShoulderAngle = 90
      pose.leftElbowAngle = 12 - phase * 72
      pose.rightElbowAngle = -12 + phase * 72
      pose.movementCue = "Keep elbows tucked at 90 deg, rotate forearms outward."
      pose.startLabel = "Start: forearms forward"
      pose.targetLabel = "Target: forearms open"
      pose.fixedCue = "Keep fixed: shoulder position and upper arm"
      pose.upperArmLocked = true
    } else if (demoName.includes("elbow flexion")) {
      pose.leftShoulderAngle = -76
      pose.rightShoulderAngle = 76
      pose.leftElbowAngle = 6 - phase * 115
      pose.rightElbowAngle = -6 + phase * 115
      pose.movementCue = "Keep upper arm still, bend elbow to bring hand up."
      pose.startLabel = "Start: elbow straight"
      pose.targetLabel = "Target: elbow bent"
      pose.focusJointLabel = "Focus joint: elbow"
      pose.fixedCue = "Keep fixed: shoulder and upper arm"
      pose.upperArmLocked = true
    } else if (demoName.includes("knee extension")) {
      pose.leftShoulderAngle = -12
      pose.rightShoulderAngle = 12
      pose.leftElbowAngle = 8
      pose.rightElbowAngle = -8
      pose.leftHipAngle = 24
      pose.leftKneeAngle = 65 - phase * 75
      pose.rightHipAngle = -8
      pose.rightKneeAngle = -4
      pose.movementCue = "From seated posture, straighten one knee forward."
      pose.startLabel = "Start: knee bent"
      pose.targetLabel = "Target: leg straight"
      pose.focusJointLabel = "Focus joint: knee"
      pose.fixedCue = "Keep fixed: thigh and hip"
      pose.upperArmLocked = true
      pose.forearmLocked = true
      pose.legLocked = true
    } else if (demoName.includes("knee flexion")) {
      pose.leftShoulderAngle = -12
      pose.rightShoulderAngle = 12
      pose.leftElbowAngle = 8
      pose.rightElbowAngle = -8
      pose.leftHipAngle = 10
      pose.leftKneeAngle = -8 + phase * 88
      pose.rightHipAngle = -8
      pose.rightKneeAngle = -4
      pose.movementCue = "Stand tall, bend knee by moving heel toward hip."
      pose.startLabel = "Start: knee straight"
      pose.targetLabel = "Target: knee bent"
      pose.focusJointLabel = "Focus joint: knee"
      pose.fixedCue = "Keep fixed: thigh and hip"
      pose.upperArmLocked = true
      pose.forearmLocked = true
      pose.legLocked = true
    } else if (demoName.includes("hip abduction")) {
      pose.leftShoulderAngle = -10
      pose.rightShoulderAngle = 10
      pose.leftElbowAngle = 6
      pose.rightElbowAngle = -6
      pose.leftHipAngle = 8 + phase * 40
      pose.leftKneeAngle = 2
      pose.rightHipAngle = -8
      pose.rightKneeAngle = -4
      pose.movementCue = "Keep trunk upright and lift leg out to side."
      pose.startLabel = "Start: feet together"
      pose.targetLabel = "Target: leg out sideways"
      pose.focusJointLabel = "Focus joint: hip"
      pose.fixedCue = "Keep fixed: knee straight and trunk upright"
      pose.upperArmLocked = true
      pose.forearmLocked = true
    } else if (demoName.includes("straight leg raise")) {
      pose.leftShoulderAngle = -8
      pose.rightShoulderAngle = 8
      pose.leftElbowAngle = 6
      pose.rightElbowAngle = -6
      pose.leftHipAngle = 10 + phase * 58
      pose.leftKneeAngle = 0
      pose.rightHipAngle = -4
      pose.rightKneeAngle = -2
      pose.modelTransform = "rotate(-90deg) translateY(6px)"
      pose.movementCue = "Lie down, keep knee straight, lift leg slowly up."
      pose.startLabel = "Start: leg down"
      pose.targetLabel = "Target: leg raised"
      pose.focusJointLabel = "Focus joint: hip"
      pose.fixedCue = "Keep fixed: knee straight, pelvis steady"
      pose.upperArmLocked = true
      pose.forearmLocked = true
      pose.legLocked = true
    } else {
      pose.leftShoulderAngle = -18 + phase * 95
      pose.rightShoulderAngle = 18 - phase * 95
      pose.leftElbowAngle = 8
      pose.rightElbowAngle = -8
      pose.movementCue = "Raise arms forward with control, then lower down."
      pose.startLabel = "Start: arms down"
      pose.targetLabel = "Target: arms up"
      pose.fixedCue = "Keep fixed: elbows mostly straight, no trunk swing"
      pose.forearmLocked = true
    }
    return pose
  }

  const currentPose = getPose(demoPhase)
  const targetPose = getPose(1)

  const {
    leftShoulderAngle,
    rightShoulderAngle,
    leftElbowAngle,
    rightElbowAngle,
    leftHipAngle,
    rightHipAngle,
    leftKneeAngle,
    rightKneeAngle,
    modelTransform,
    movementCue,
    startLabel,
    targetLabel,
    focusJointLabel,
    fixedCue,
    upperArmLocked,
    forearmLocked,
    legLocked,
  } = currentPose

  const {
    leftShoulderAngle: targetLeftShoulder,
    rightShoulderAngle: targetRightShoulder,
    leftElbowAngle: targetLeftElbow,
    rightElbowAngle: targetRightElbow,
    leftHipAngle: targetLeftHip,
    rightHipAngle: targetRightHip,
    leftKneeAngle: targetLeftKnee,
    rightKneeAngle: targetRightKnee,
  } = targetPose

  const torsoSway = Math.sin(demoTick / 10) * 3
  const focusJoint = focusJointLabel.toLowerCase()
  const shoulderFocused = focusJoint.includes("shoulder")
  const elbowFocused = focusJoint.includes("elbow")
  const hipFocused = focusJoint.includes("hip")
  const kneeFocused = focusJoint.includes("knee")

  const focusJointFill = "#fde047"
  const regularJointFill = "#86efac"

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-foreground/5",
        className
      )}
    >
      {showDemo ? (
        <div className="relative flex h-full min-h-[400px] items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-600/20 via-cyan-500/15 to-blue-600/20">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #34d399 0, transparent 40%), radial-gradient(circle at 80% 80%, #22d3ee 0, transparent 45%)" }} />

          <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-4 p-6 text-center">
            <p className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-200">
              Exercise Demo · Starts in {demoSecondsRemaining}s
            </p>
            <h3 className="text-xl font-semibold text-white">{demoExerciseName ?? "Exercise"}</h3>
            <p className="max-w-xl text-sm text-white/90">
              {movementCue}
            </p>

            <div className="relative mt-2 h-60 w-72" style={{ transform: `translateY(${torsoSway}px) ${modelTransform}` }}>
              <svg viewBox="0 0 280 230" className="h-full w-full">
                <ellipse cx="140" cy="210" rx="66" ry="10" fill="rgba(0,0,0,0.2)" />

                <g opacity="0.3">
                  <circle cx="140" cy="34" r="16" fill="#dbeafe" />
                  <rect x="120" y="52" width="40" height="64" rx="18" fill="#bae6fd" />

                  <g transform={`rotate(${targetLeftShoulder} 122 68)`}>
                    <line x1="122" y1="68" x2="80" y2="68" stroke="#bae6fd" strokeWidth="8" strokeLinecap="round" />
                    <g transform={`rotate(${targetLeftElbow} 80 68)`}>
                      <line x1="80" y1="68" x2="48" y2="68" stroke="#bae6fd" strokeWidth="8" strokeLinecap="round" />
                    </g>
                  </g>
                  <g transform={`rotate(${targetRightShoulder} 158 68)`}>
                    <line x1="158" y1="68" x2="200" y2="68" stroke="#bae6fd" strokeWidth="8" strokeLinecap="round" />
                    <g transform={`rotate(${targetRightElbow} 200 68)`}>
                      <line x1="200" y1="68" x2="232" y2="68" stroke="#bae6fd" strokeWidth="8" strokeLinecap="round" />
                    </g>
                  </g>
                  <g transform={`rotate(${targetLeftHip} 132 116)`}>
                    <line x1="132" y1="116" x2="132" y2="152" stroke="#bae6fd" strokeWidth="8" strokeLinecap="round" />
                    <g transform={`rotate(${targetLeftKnee} 132 152)`}>
                      <line x1="132" y1="152" x2="132" y2="184" stroke="#bae6fd" strokeWidth="8" strokeLinecap="round" />
                    </g>
                  </g>
                  <g transform={`rotate(${targetRightHip} 148 116)`}>
                    <line x1="148" y1="116" x2="148" y2="152" stroke="#bae6fd" strokeWidth="8" strokeLinecap="round" />
                    <g transform={`rotate(${targetRightKnee} 148 152)`}>
                      <line x1="148" y1="152" x2="148" y2="184" stroke="#bae6fd" strokeWidth="8" strokeLinecap="round" />
                    </g>
                  </g>
                </g>

                <g>
                  <circle cx="140" cy="34" r="17" fill="#fcd34d" />
                  <rect x="119" y="50" width="42" height="66" rx="18" fill="#06b6d4" />
                  <rect x="119" y="61" width="42" height="8" rx="4" fill="#67e8f9" opacity="0.8" />

                  <g opacity={upperArmLocked ? 0.55 : 1} transform={`rotate(${leftShoulderAngle} 122 68)`}>
                    <line x1="122" y1="68" x2="80" y2="68" stroke="#facc15" strokeWidth="8" strokeLinecap="round" />
                    <g opacity={forearmLocked ? 0.55 : 1} transform={`rotate(${leftElbowAngle} 80 68)`}>
                      <line x1="80" y1="68" x2="48" y2="68" stroke="#facc15" strokeWidth="8" strokeLinecap="round" />
                    </g>
                  </g>
                  <g opacity={upperArmLocked ? 0.55 : 1} transform={`rotate(${rightShoulderAngle} 158 68)`}>
                    <line x1="158" y1="68" x2="200" y2="68" stroke="#facc15" strokeWidth="8" strokeLinecap="round" />
                    <g opacity={forearmLocked ? 0.55 : 1} transform={`rotate(${rightElbowAngle} 200 68)`}>
                      <line x1="200" y1="68" x2="232" y2="68" stroke="#facc15" strokeWidth="8" strokeLinecap="round" />
                    </g>
                  </g>

                  <g opacity={legLocked ? 0.55 : 1} transform={`rotate(${leftHipAngle} 132 116)`}>
                    <line x1="132" y1="116" x2="132" y2="152" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                    <g transform={`rotate(${leftKneeAngle} 132 152)`}>
                      <line x1="132" y1="152" x2="132" y2="184" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                    </g>
                  </g>
                  <g opacity={legLocked ? 0.55 : 1} transform={`rotate(${rightHipAngle} 148 116)`}>
                    <line x1="148" y1="116" x2="148" y2="152" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                    <g transform={`rotate(${rightKneeAngle} 148 152)`}>
                      <line x1="148" y1="152" x2="148" y2="184" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                    </g>
                  </g>
                </g>

                <g stroke="#ffffff" strokeWidth="2">
                  <circle cx="122" cy="68" r="5" fill={shoulderFocused ? focusJointFill : regularJointFill} />
                  <circle cx="158" cy="68" r="5" fill={shoulderFocused ? focusJointFill : regularJointFill} />
                  <circle cx="80" cy="68" r="5" fill={elbowFocused ? focusJointFill : regularJointFill} />
                  <circle cx="200" cy="68" r="5" fill={elbowFocused ? focusJointFill : regularJointFill} />
                  <circle cx="132" cy="116" r="5" fill={hipFocused ? focusJointFill : regularJointFill} />
                  <circle cx="148" cy="116" r="5" fill={hipFocused ? focusJointFill : regularJointFill} />
                  <circle cx="132" cy="152" r="5" fill={kneeFocused ? focusJointFill : regularJointFill} />
                  <circle cx="148" cy="152" r="5" fill={kneeFocused ? focusJointFill : regularJointFill} />
                </g>

                <text x="140" y="16" textAnchor="middle" fill="#a5f3fc" fontSize="10" fontWeight="600">
                  Ghost Target Pose
                </text>
              </svg>
            </div>

            <div className="w-full max-w-md rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-left text-xs text-white/90">
              <p>{focusJointLabel}</p>
              <p>{fixedCue}</p>
              <p>{startLabel}</p>
              <p>{targetLabel}</p>
              <p>Tip: match your pose with the light blue ghost shape.</p>
            </div>

            <div className="h-2 w-64 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-emerald-400 transition-all duration-700"
                style={{ width: `${Math.max(0, Math.min(100, ((10 - demoSecondsRemaining) / 10) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      ) : isActive ? (
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
          <div className="absolute left-3 top-3 z-20 w-64 rounded-xl bg-black/60 p-3 text-white backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wide text-white/70">Posture Progress</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm">Correctness</span>
              <span className="text-sm font-semibold">{postureScore}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-emerald-400 transition-all duration-200"
                style={{ width: `${Math.max(5, postureScore)}%` }}
              />
            </div>
            <div className="mt-3 space-y-1 text-xs">
              <p className={poseDetected ? "text-emerald-300" : "text-white/70"}>
                {poseDetected ? "✓" : "○"} Step 1: Body detected
              </p>
              <p className={targetReached ? "text-emerald-300" : "text-white/70"}>
                {targetReached ? "✓" : "○"} Step 2: Reach target posture
              </p>
              <p className={returnedToStart ? "text-emerald-300" : "text-white/70"}>
                {returnedToStart ? "✓" : "○"} Step 3: Return to start
              </p>
              <p className="pt-1 font-medium text-white">Reps counted: {output.repCount}</p>
              <p className="text-white/80">Left hand: {leftRepCount} reps · {leftPostureScore}%</p>
              <p className="text-white/80">Right hand: {rightRepCount} reps · {rightPostureScore}%</p>
            </div>
          </div>
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
