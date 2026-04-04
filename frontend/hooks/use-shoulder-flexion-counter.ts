/**
 * Shoulder Flexion Rep Counter
 *
 * Frame-accurate, state-machine-based rep counter for shoulder flexion exercises.
 * Driven frame-by-frame from WebcamFeed via processFrame().
 *
 * ─── TUNABLE CONSTANTS ───────────────────────────────────────────────────────
 * All thresholds are in one place below. Adjust these to tune sensitivity.
 */

// ─── Tunable constants ────────────────────────────────────────────────────────

/** EMA alpha — higher = more responsive, lower = smoother. Range 0.1–0.5. */
const SMOOTHING_FACTOR = 0.25

/** Frames that must agree before a state transition is accepted. */
const REQUIRED_STABLE_FRAMES = 6

/** Minimum wall-clock ms between two rep completions. */
const MIN_TIME_BETWEEN_REPS_MS = 800

/** Hard lockout ms after each rep count to absorb rebound jitter. */
const REP_COOLDOWN_MS = 500

/**
 * Maximum angular velocity in deg/s treated as valid motion.
 * Anything above this is a tracking spike and is discarded.
 * At 30 fps a real fast rep is ~600 deg/s; set ceiling above that.
 */
const MAX_ANGULAR_VELOCITY = 1200

/** Minimum landmark visibility score to accept a joint for computation. */
const MIN_VISIBILITY = 0.7

/** Startup window in ms during which reps are not counted but ROM is sampled. */
const CALIBRATION_WINDOW_MS = 0  // disabled — fixed thresholds are more reliable

/**
 * Confidence sum advantage the non-active side needs over the active side
 * before we allow a side switch. Higher = stickier side selection.
 */
const SIDE_SWITCH_MARGIN = 0.6

// Fixed thresholds for shoulder flexion (degrees).
// Arm at rest/down = ~10–35°. Must reach ≥ 60° to count as UP.
// Must return to ≤ 40° to count as DOWN. Gap of 20° prevents threshold bouncing.
const DEFAULT_UP_THRESHOLD = 60
const DEFAULT_DOWN_THRESHOLD = 40

/**
 * Minimum full-cycle ROM in degrees required to accept a rep as valid.
 * Arm must travel at least this much in a single cycle.
 */
const MIN_ROM = 35

const UP_FRACTION = 0.60    // unused (calibration disabled)
const DOWN_FRACTION = 0.22  // unused (calibration disabled)

// ─── MediaPipe landmark indices ───────────────────────────────────────────────

const LM = {
  LEFT_SHOULDER:  11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW:     13,
  RIGHT_ELBOW:    14,
  LEFT_HIP:       23,
  RIGHT_HIP:      24,
} as const

// ─── Types ────────────────────────────────────────────────────────────────────

type RepState = "DOWN" | "UP"
type Side     = "left" | "right"

export interface PoseLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface CounterOutput {
  repCount:      number
  currentState:  RepState
  currentAngle:  number | null
  activeSide:    Side
  calibrating:   boolean
  /** Thresholds currently in use — useful for debug overlay. */
  upThreshold:   number
  downThreshold: number
  cycleMinAngle: number | null
  cycleMaxAngle: number | null
}

// ─── Pure helper functions ────────────────────────────────────────────────────

/**
 * Compute the angle at joint B formed by rays B→A and B→C.
 * Returns degrees 0–180. Uses only x/y (image plane is sufficient for flexion).
 */
function computeAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const ax = a.x - b.x,  ay = a.y - b.y
  const cx = c.x - b.x,  cy = c.y - b.y
  const dot   = ax * cx + ay * cy
  const magAB = Math.sqrt(ax * ax + ay * ay)
  const magCB = Math.sqrt(cx * cx + cy * cy)
  if (magAB === 0 || magCB === 0) return 0
  return (Math.acos(Math.max(-1, Math.min(1, dot / (magAB * magCB)))) * 180) / Math.PI
}

/** EMA step. */
function ema(prev: number, next: number, alpha: number): number {
  return alpha * next + (1 - alpha) * prev
}

/** True if the landmark has sufficient visibility confidence. */
function isVisible(lm: PoseLandmark): boolean {
  return (lm.visibility ?? 1) >= MIN_VISIBILITY
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates an imperative (non-React) counter instance.
 * Use a ref to hold this in React components:
 *   const counterRef = useRef(createShoulderFlexionCounter())
 *
 * Call counterRef.current.reset() when starting a new session.
 * Call counterRef.current.processFrame(landmarks, timestamp) each pose frame.
 */
export function createShoulderFlexionCounter() {
  // ── Core state ──────────────────────────────────────────────────────────────
  let repCount      = 0
  let repState: RepState = "DOWN"
  let smoothedAngle: number | null = null

  // ── Transition confirmation ──────────────────────────────────────────────────
  let pendingTarget: RepState | null = null
  let stableFrames  = 0

  // ── Timing guards ────────────────────────────────────────────────────────────
  let lastRepTimestamp  = 0
  let cooldownUntil     = 0

  // ── Velocity filter ─────────────────────────────────────────────────────────
  // We compute velocity on smoothed angles to avoid raw-landmark noise.
  let prevSmoothedAngle: number | null = null
  let prevFrameTimestamp: number | null = null

  // ── Per-cycle range ──────────────────────────────────────────────────────────
  let cycleMin: number | null = null
  let cycleMax: number | null = null

  // ── Side selection ────────────────────────────────────────────────────────────
  let activeSide: Side = "right"
  let sideLocked = false

  // ── Calibration ───────────────────────────────────────────────────────────────
  // calibrationEndTime is set on reset() so it is relative to session start.
  let calibrationEndTime = 0
  let calibrated = false
  const calibSamples: number[] = []
  let upThreshold   = DEFAULT_UP_THRESHOLD
  let downThreshold = DEFAULT_DOWN_THRESHOLD

  // ─── Internal helpers ───────────────────────────────────────────────────────

  function isCalibrating(now: number): boolean {
    return !calibrated && now < calibrationEndTime
  }

  function finalizeCalibration(): void {
    if (calibSamples.length > 0) {
      const min = Math.min(...calibSamples)
      const max = Math.max(...calibSamples)
      const rom = max - min
      if (rom >= MIN_ROM) {
        downThreshold = min + rom * DOWN_FRACTION
        upThreshold   = min + rom * UP_FRACTION
        // Clamp to sane absolute bounds
        downThreshold = Math.max(15, Math.min(downThreshold, 55))
        upThreshold   = Math.max(55, Math.min(upThreshold, 150))
      }
    }
    calibrated = true
  }

  function pickSide(landmarks: PoseLandmark[]): Side {
    // While side-locked (arm is UP), always return current side.
    if (sideLocked) return activeSide

    const lVis =
      (landmarks[LM.LEFT_SHOULDER]?.visibility  ?? 0) +
      (landmarks[LM.LEFT_ELBOW]?.visibility     ?? 0) +
      (landmarks[LM.LEFT_HIP]?.visibility       ?? 0)
    const rVis =
      (landmarks[LM.RIGHT_SHOULDER]?.visibility ?? 0) +
      (landmarks[LM.RIGHT_ELBOW]?.visibility    ?? 0) +
      (landmarks[LM.RIGHT_HIP]?.visibility      ?? 0)

    // Stick with current side unless the other side has a clear advantage.
    if (activeSide === "left"  && lVis >= rVis - SIDE_SWITCH_MARGIN) return "left"
    if (activeSide === "right" && rVis >= lVis - SIDE_SWITCH_MARGIN) return "right"

    const next: Side = lVis > rVis ? "left" : "right"
    activeSide = next
    return next
  }

  function landmarksForSide(side: Side, lm: PoseLandmark[]) {
    return side === "left"
      ? { hip: lm[LM.LEFT_HIP],  shoulder: lm[LM.LEFT_SHOULDER],  elbow: lm[LM.LEFT_ELBOW]  }
      : { hip: lm[LM.RIGHT_HIP], shoulder: lm[LM.RIGHT_SHOULDER], elbow: lm[LM.RIGHT_ELBOW] }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Process one pose frame.
   * @param landmarks  33-element array from MediaPipe Pose.
   * @param timestamp  performance.now() value for this frame (ms).
   * @returns CounterOutput — always returned, even for rejected frames.
   */
  function processFrame(landmarks: PoseLandmark[], timestamp: number): CounterOutput {
    const now = Date.now()
    const calibPhase = isCalibrating(now)

    // Choose side before any early return so side display stays consistent.
    const side = pickSide(landmarks)
    const { hip, shoulder, elbow } = landmarksForSide(side, landmarks)

    // Snapshot for early-exit returns.
    const baseOutput: CounterOutput = {
      repCount,
      currentState:  repState,
      currentAngle:  smoothedAngle,
      activeSide:    side,
      calibrating:   calibPhase,
      upThreshold,
      downThreshold,
      cycleMinAngle: cycleMin,
      cycleMaxAngle: cycleMax,
    }

    // ── 1. Landmark confidence gate ───────────────────────────────────────────
    if (
      !hip      || !isVisible(hip)      ||
      !shoulder || !isVisible(shoulder) ||
      !elbow    || !isVisible(elbow)
    ) {
      return baseOutput
    }

    // ── 1b. Body-in-frame sanity check ────────────────────────────────────────
    // In MediaPipe normalized coords y increases downward.
    // Hip must be meaningfully below the shoulder (hip.y > shoulder.y).
    // If not, the torso is out of frame and landmarks are extrapolated garbage.
    if (hip.y <= shoulder.y + 0.05) {
      return baseOutput
    }

    // ── 2. Raw angle ──────────────────────────────────────────────────────────
    const rawAngle = computeAngle(hip, shoulder, elbow)

    // ── 3. EMA smoothing (first frame: seed with raw value) ──────────────────
    const newSmoothed = smoothedAngle === null
      ? rawAngle
      : ema(smoothedAngle, rawAngle, SMOOTHING_FACTOR)

    // ── 4. Velocity spike rejection (on smoothed → smoothed delta) ───────────
    // Computing on smoothed values means one bad raw frame won't inflate velocity;
    // but a sustained tracking jump that survives smoothing still gets caught here.
    if (prevSmoothedAngle !== null && prevFrameTimestamp !== null) {
      const dt = (timestamp - prevFrameTimestamp) / 1000 // convert ms → s
      if (dt > 0 && dt < 0.5) {                          // ignore stale frames (>500ms gap)
        const angularVelocity = Math.abs(newSmoothed - prevSmoothedAngle) / dt
        if (angularVelocity > MAX_ANGULAR_VELOCITY) {
          // Discard this frame — don't update smoothedAngle so the spike
          // doesn't corrupt the EMA history.
          prevFrameTimestamp = timestamp
          return baseOutput
        }
      }
    }

    // Accept this frame.
    smoothedAngle        = newSmoothed
    prevSmoothedAngle    = newSmoothed
    prevFrameTimestamp   = timestamp
    const angle          = newSmoothed

    // ── 5. Calibration accumulation ───────────────────────────────────────────
    if (calibPhase) {
      calibSamples.push(angle)
      return { ...baseOutput, currentAngle: angle }
    }

    // Transition from calibration → counting on the first post-calibration frame.
    if (!calibrated) {
      finalizeCalibration()
    }

    // ── 6. Per-cycle range tracking ───────────────────────────────────────────
    cycleMin = cycleMin === null ? angle : Math.min(cycleMin, angle)
    cycleMax = cycleMax === null ? angle : Math.max(cycleMax, angle)

    // ── 7. State machine with stable-frame hysteresis ─────────────────────────
    //
    // Determine what the new state WOULD be based on thresholds:
    //   angle >= upThreshold   → wants to be UP
    //   angle <= downThreshold → wants to be DOWN
    //   between thresholds     → no preference (hysteresis zone)
    //
    let wantedState: RepState | null = null
    if (angle >= upThreshold)   wantedState = "UP"
    if (angle <= downThreshold) wantedState = "DOWN"

    if (wantedState !== null && wantedState !== repState) {
      // Accumulate stable frames toward the wanted transition.
      if (wantedState === pendingTarget) {
        stableFrames++
      } else {
        // New wanted state — restart confirmation counter.
        pendingTarget = wantedState
        stableFrames  = 1
      }

      if (stableFrames >= REQUIRED_STABLE_FRAMES) {
        const previousState = repState
        repState      = wantedState
        pendingTarget = null
        stableFrames  = 0

        // Lock side while arm is elevated to prevent mid-rep side flip.
        sideLocked = (repState === "UP")

        // ── 8. Rep completion: only on UP → DOWN ──────────────────────────────
        if (previousState === "UP" && repState === "DOWN") {
          const elapsed        = now - lastRepTimestamp
          const inCooldown     = now < cooldownUntil
          const cycleRom       = (cycleMax ?? 0) - (cycleMin ?? 0)
          const rangeValid     = cycleRom >= MIN_ROM

          if (!inCooldown && elapsed >= MIN_TIME_BETWEEN_REPS_MS && rangeValid) {
            repCount++
            lastRepTimestamp = now
            cooldownUntil    = now + REP_COOLDOWN_MS
          }

          // Always reset per-cycle range on DOWN transition.
          cycleMin = null
          cycleMax = null
        }
      }
    } else if (wantedState === repState || wantedState === null) {
      // Back in the current state zone or in the hysteresis band — kill pending.
      if (wantedState === repState) {
        pendingTarget = null
        stableFrames  = 0
      }
      // If wantedState === null (hysteresis band), keep accumulating if a
      // pending transition was already started — we don't cancel it, because
      // the arm may just be passing through. Cancellation only happens when
      // the angle moves back into the opposite state zone.
    }

    return {
      repCount,
      currentState:  repState,
      currentAngle:  angle,
      activeSide,
      calibrating:   false,
      upThreshold,
      downThreshold,
      cycleMinAngle: cycleMin,
      cycleMaxAngle: cycleMax,
    }
  }

  /**
   * Reset all session state. Triggers a fresh calibration window.
   * Call this at the start of every new exercise session.
   */
  function reset(): void {
    repCount           = 0
    repState           = "DOWN"
    smoothedAngle      = null
    pendingTarget      = null
    stableFrames       = 0
    lastRepTimestamp   = 0
    cooldownUntil      = 0
    prevSmoothedAngle  = null
    prevFrameTimestamp = null
    cycleMin           = null
    cycleMax           = null
    activeSide         = "right"
    sideLocked         = false
    calibrated         = false
    calibSamples.length = 0
    upThreshold        = DEFAULT_UP_THRESHOLD
    downThreshold      = DEFAULT_DOWN_THRESHOLD
    // Calibration window starts NOW (relative to session start, not module load).
    calibrationEndTime = Date.now() + CALIBRATION_WINDOW_MS
  }

  // Initialise calibration window for the first session.
  reset()

  return { processFrame, reset }
}
