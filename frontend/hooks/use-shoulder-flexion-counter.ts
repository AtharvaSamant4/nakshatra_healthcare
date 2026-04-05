import { useRef, useCallback, useMemo, useState } from "react";

// ─── Public types (kept identical for interface compatibility) ─────────────────

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export type MovementState = "DOWN" | "UP";

export interface ExerciseAngleConfig {
  joint: string;
  points: [string, string, string] | string[];
  target_angle: number;
  threshold: number;
}

interface CounterOutput {
  repCount: number;
  currentState: MovementState;
  currentAngle: number;
  /** Progressive ROM score 0–100 (parallel to rep counting; does not affect reps). */
  score: number;
  /** Label derived from {@link CounterOutput.score}. */
  quality: string;
  debug: {
    maxAngle: number;
    minAngle: number;
    velocity: number;
    lastFrameTime: number;
    activeSide: "left" | "right";
    calibrated: boolean;
    upThreshold: number;
    downThreshold: number;
    motionTrend: string;
    targetReached: boolean;
    startReached: boolean;
    postureScore: number;
    leftRepCount: number;
    rightRepCount: number;
    leftPostureScore: number;
    rightPostureScore: number;
  };
}

interface ShoulderFlexionOptions {
  enableCalibration?: boolean;
  calibrationWindowMs?: number;
}

interface ExerciseCounterOptions extends ShoulderFlexionOptions {
  angleConfig?: ExerciseAngleConfig;
}

// ─── Internal types ───────────────────────────────────────────────────────────

/**
 * A rep goes through these phases in order:
 *
 *   BASELINE  → AT_REST  → TO_TARGET  → AT_TARGET  → RETURNING  → AT_REST (rep counted)
 *
 * Each transition requires STABLE_FRAMES consecutive frames in the new zone
 * to prevent noise from triggering a false transition.
 */
type RepPhase = "BASELINE" | "AT_REST" | "TO_TARGET" | "AT_TARGET" | "RETURNING";

interface SideState {
  phase: RepPhase;
  repCount: number;
  lastRepTime: number;
  smoothedAngle: number | null;
  lastFrameTime: number;
  /** Consecutive frames currently in the "zone" we're trying to confirm entry into */
  zoneFrames: number;
  /** Best angle reached in this rep direction (max for higher_is_target, min for lower) */
  peakAngle: number;
  /** Did we properly reach the target zone this rep? */
  targetConfirmedThisRep: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Tuned for accuracy: resist noise, require full ROM */
const C = {
  /** EMA smoothing weight for new samples. Lower = smoother but slower. */
  SMOOTHING_ALPHA: 0.15,
  /** How long to collect angles for the baseline (ms) */
  BASELINE_DURATION_MS: 2000,
  /** Minimum frames collected before we accept a baseline */
  BASELINE_MIN_SAMPLES: 20,
  /**
   * Consecutive frames required to confirm a zone transition.
   * At ~30 fps this is ~200 ms — enough to ignore jitter.
   */
  STABLE_FRAMES: 6,
  /**
   * Degrees from baseline to be considered "at rest".
   * Arm must return this close to baseline to complete a rep.
   */
  AT_REST_MARGIN: 28,
  /**
   * Degrees that arm must leave the rest zone before we start tracking
   * a rep (prevents counting noise at rest).
   */
  LEAVE_REST_MARGIN: 30,
  /**
   * Degrees back from the peak before we call it "leaving the target zone"
   * and enter RETURNING phase.
   */
  LEAVE_TARGET_MARGIN: 12,
  /** Minimum ms between consecutive reps */
  MIN_REP_INTERVAL_MS: 1500,
  /** Maximum angular velocity (deg/s) — reject frames that jump too fast */
  MAX_VELOCITY_DPS: 450,
  /** MediaPipe visibility threshold — skip landmarks below this */
  MIN_VISIBILITY: 0.55,
  /**
   * Rep validity: peakAngle must be at least this fraction of the full
   * expected range (target − baseline). Prevents counting partial reps.
   */
  MIN_TRAVEL_FRACTION: 0.65,
} as const;

// ─── Landmark map ─────────────────────────────────────────────────────────────

const LANDMARK_INDEX: Record<string, number> = {
  nose: 0,
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28,
};

const DEFAULT_ANGLE_CONFIG: ExerciseAngleConfig = {
  joint: "left_shoulder",
  points: ["left_elbow", "left_shoulder", "left_hip"],
  target_angle: 160,
  threshold: 15,
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const calculateAngle = (a: Landmark, b: Landmark, c: Landmark): number => {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
};

const median = (arr: number[]): number => {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
};

const normalizeConfig = (input?: ExerciseAngleConfig): ExerciseAngleConfig => {
  if (!input || !Array.isArray(input.points) || input.points.length < 3) {
    return DEFAULT_ANGLE_CONFIG;
  }
  return {
    joint: input.joint,
    points: [input.points[0], input.points[1], input.points[2]],
    target_angle: input.target_angle,
    threshold: input.threshold,
  };
};

const mirrorName = (p: string) =>
  p.startsWith("left_")
    ? p.replace("left_", "right_")
    : p.startsWith("right_")
    ? p.replace("right_", "left_")
    : p;

const getSide = (joint: string): "left" | "right" =>
  joint.startsWith("left_") ? "left" : "right";

const getMotionTrend = (target: number) =>
  target >= 95 ? "higher_is_target" : "lower_is_target";

/**
 * Progressive angle score (0–100) + quality label. Independent of rep validation.
 * Uses baseline ↔ target as min/max range; inverts progress when motion trend is toward lower angles.
 */
const computeProgressiveScoreAndQuality = (
  currentAngle: number,
  baselineAngle: number,
  targetAngle: number,
  motionTrend: "higher_is_target" | "lower_is_target"
): { score: number; quality: string } => {
  let score = 0;
  let quality = "poor";

  const minTarget = Math.min(baselineAngle, targetAngle);
  const maxTarget = Math.max(baselineAngle, targetAngle);
  const clampedAngle = Math.max(minTarget, Math.min(currentAngle, maxTarget));
  const denom = maxTarget - minTarget;
  let progress =
    denom > 0
      ? motionTrend === "higher_is_target"
        ? (clampedAngle - minTarget) / denom
        : (maxTarget - clampedAngle) / denom
      : 0;
  progress = clamp(progress, 0, 1);
  score = Math.round(progress * 100);

  if (score >= 85) quality = "perfect";
  else if (score >= 60) quality = "good";
  else if (score >= 30) quality = "improving";

  return { score, quality };
};

const buildSideState = (): SideState => ({
  phase: "BASELINE",
  repCount: 0,
  lastRepTime: 0,
  smoothedAngle: null,
  lastFrameTime: 0,
  zoneFrames: 0,
  peakAngle: 0,
  targetConfirmedThisRep: false,
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useExerciseCounter = (options?: ExerciseCounterOptions) => {
  const config = useMemo(() => normalizeConfig(options?.angleConfig), [options?.angleConfig]);

  const configuredSide = useMemo(() => getSide(config.joint), [config.joint]);
  const motionTrend = useMemo(() => getMotionTrend(config.target_angle), [config.target_angle]);

  // Points to use for the configured side and its mirror
  const configuredPoints = useMemo(
    () => [config.points[0], config.points[1], config.points[2]] as [string, string, string],
    [config.points]
  );
  const mirroredPoints = useMemo(
    () => configuredPoints.map(mirrorName) as [string, string, string],
    [configuredPoints]
  );

  // ── Shared mutable state (all in one ref to avoid stale closures) ──────────
  const stateRef = useRef({
    // Baseline capture
    baselineSamples: [] as number[],
    baselineEndTime: 0,
    baselineAngle: null as number | null,

    // Active side for UI display
    activeSide: configuredSide as "left" | "right",

    // Per-side state
    sides: {
      left: buildSideState(),
      right: buildSideState(),
    } as Record<"left" | "right", SideState>,
  });

  // ── React output state (triggers re-render for UI) ─────────────────────────
  const [output, setOutput] = useState<CounterOutput>({
    repCount: 0,
    currentState: "DOWN",
    currentAngle: 0,
    score: 0,
    quality: "poor",
    debug: {
      maxAngle: 0,
      minAngle: 180,
      velocity: 0,
      lastFrameTime: 0,
      activeSide: configuredSide,
      calibrated: false,
      upThreshold: config.target_angle - config.threshold,
      downThreshold: 0,
      motionTrend,
      targetReached: false,
      startReached: true,
      postureScore: 0,
      leftRepCount: 0,
      rightRepCount: 0,
      leftPostureScore: 0,
      rightPostureScore: 0,
    },
  });

  // ── Derived threshold helpers (use stateRef.current.baselineAngle) ─────────
  const targetZoneThreshold = useMemo(() => {
    // angle must be this close to target_angle to be "at target"
    return motionTrend === "higher_is_target"
      ? config.target_angle - config.threshold
      : config.target_angle + config.threshold;
  }, [config.target_angle, config.threshold, motionTrend]);

  /** Is the current angle in the "at target" zone? */
  const isAtTargetZone = useCallback(
    (angle: number) =>
      motionTrend === "higher_is_target"
        ? angle >= targetZoneThreshold
        : angle <= targetZoneThreshold,
    [motionTrend, targetZoneThreshold]
  );

  /** Is the current angle in the "at rest" zone? */
  const isAtRestZone = useCallback(
    (angle: number) => {
      const base = stateRef.current.baselineAngle;
      if (base === null) return false;
      return Math.abs(angle - base) <= C.AT_REST_MARGIN;
    },
    []
  );

  /** Has the angle left the rest zone enough to start a rep? */
  const hasLeftRestZone = useCallback(
    (angle: number) => {
      const base = stateRef.current.baselineAngle;
      if (base === null) return false;
      const moved =
        motionTrend === "higher_is_target"
          ? angle - base
          : base - angle;
      return moved >= C.LEAVE_REST_MARGIN;
    },
    [motionTrend]
  );

  /** Has the angle moved back enough from the peak to call "leaving target"? */
  const hasLeftTargetZone = useCallback(
    (angle: number, peakAngle: number) => {
      return motionTrend === "higher_is_target"
        ? angle < peakAngle - C.LEAVE_TARGET_MARGIN
        : angle > peakAngle + C.LEAVE_TARGET_MARGIN;
    },
    [motionTrend]
  );

  /**
   * Has the peak angle traveled enough of the expected range to be a valid rep?
   * Prevents counting "half reps" that barely grazed the target.
   */
  const isValidRepTravel = useCallback(
    (peakAngle: number) => {
      const base = stateRef.current.baselineAngle;
      if (base === null) return false;
      const actualTravel =
        motionTrend === "higher_is_target"
          ? peakAngle - base
          : base - peakAngle;
      const expectedTravel = Math.abs(config.target_angle - base);
      return actualTravel >= expectedTravel * C.MIN_TRAVEL_FRACTION;
    },
    [config.target_angle, motionTrend]
  );

  /** 0–100 score: how far toward target the current angle is (for UI arc/bar) */
  const getPostureScore = useCallback(
    (angle: number): number => {
      const base = stateRef.current.baselineAngle ?? 0;
      const target = config.target_angle;
      const range = Math.abs(target - base);
      if (range < 1) return 0;
      const progress =
        motionTrend === "higher_is_target"
          ? (angle - base) / range
          : (base - angle) / range;
      return Math.round(clamp(progress, 0, 1) * 100);
    },
    [config.target_angle, motionTrend]
  );

  // ── State machine per side ─────────────────────────────────────────────────

  const updateSide = useCallback(
    (side: "left" | "right", angle: number) => {
      const now = Date.now();
      const st = stateRef.current.sides[side];

      // ── BASELINE phase ─────────────────────────────────────────────────────
      if (st.phase === "BASELINE") {
        // Collect samples until baseline window closes
        if (stateRef.current.baselineEndTime === 0) {
          stateRef.current.baselineEndTime = now + C.BASELINE_DURATION_MS;
        }
        stateRef.current.baselineSamples.push(angle);

        if (
          now >= stateRef.current.baselineEndTime &&
          stateRef.current.baselineSamples.length >= C.BASELINE_MIN_SAMPLES
        ) {
          // Take the "resting" extreme: lowest angle for higher_is_target, highest for lower
          const samples = stateRef.current.baselineSamples;
          const sorted = [...samples].sort((a, b) => a - b);
          // Use 15th percentile as resting position (robustly ignores noise/outliers)
          const pct15Idx = Math.floor(sorted.length * 0.15);
          const computed =
            motionTrend === "higher_is_target" ? sorted[pct15Idx] : sorted[sorted.length - 1 - pct15Idx];
          stateRef.current.baselineAngle = computed;
        } else {
          return; // still in baseline — don't process reps yet
        }

        // Transition out of BASELINE into AT_REST
        st.phase = "AT_REST";
        st.zoneFrames = 0;
        return;
      }

      // ── AT_REST phase ──────────────────────────────────────────────────────
      if (st.phase === "AT_REST") {
        if (hasLeftRestZone(angle)) {
          st.zoneFrames += 1;
        } else {
          st.zoneFrames = 0;
        }

        if (st.zoneFrames >= C.STABLE_FRAMES) {
          // Arm has clearly left the resting zone — start a rep attempt
          st.phase = "TO_TARGET";
          st.zoneFrames = 0;
          st.targetConfirmedThisRep = false;
          // Reset peak to the "worst" direction so any movement improves it
          st.peakAngle = motionTrend === "higher_is_target" ? -Infinity : Infinity;
        }
        return;
      }

      // ── TO_TARGET phase ────────────────────────────────────────────────────
      if (st.phase === "TO_TARGET") {
        // Track the peak angle (best direction toward target)
        if (motionTrend === "higher_is_target") {
          if (angle > st.peakAngle) st.peakAngle = angle;
        } else {
          if (angle < st.peakAngle) st.peakAngle = angle;
        }

        if (isAtTargetZone(angle)) {
          st.zoneFrames += 1;
        } else if (isAtRestZone(angle)) {
          // Returned to rest without reaching target — false start, reset
          st.phase = "AT_REST";
          st.zoneFrames = 0;
          st.targetConfirmedThisRep = false;
          return;
        } else {
          st.zoneFrames = 0;
        }

        if (st.zoneFrames >= C.STABLE_FRAMES) {
          // Reached target zone stably
          st.phase = "AT_TARGET";
          st.zoneFrames = 0;
          st.targetConfirmedThisRep = true;
        }
        return;
      }

      // ── AT_TARGET phase ────────────────────────────────────────────────────
      if (st.phase === "AT_TARGET") {
        // Keep updating the peak while at target
        if (motionTrend === "higher_is_target") {
          if (angle > st.peakAngle) st.peakAngle = angle;
        } else {
          if (angle < st.peakAngle) st.peakAngle = angle;
        }

        if (hasLeftTargetZone(angle, st.peakAngle)) {
          st.zoneFrames += 1;
        } else {
          st.zoneFrames = 0;
        }

        if (st.zoneFrames >= C.STABLE_FRAMES) {
          // Clearly moving back toward start
          st.phase = "RETURNING";
          st.zoneFrames = 0;
        }
        return;
      }

      // ── RETURNING phase ────────────────────────────────────────────────────
      if (st.phase === "RETURNING") {
        // If they go back to target (slow controlled reps), update accordingly
        if (isAtTargetZone(angle)) {
          st.phase = "AT_TARGET";
          st.zoneFrames = 0;
          if (motionTrend === "higher_is_target") {
            if (angle > st.peakAngle) st.peakAngle = angle;
          } else {
            if (angle < st.peakAngle) st.peakAngle = angle;
          }
          return;
        }

        if (isAtRestZone(angle)) {
          st.zoneFrames += 1;
        } else {
          st.zoneFrames = 0;
        }

        if (st.zoneFrames >= C.STABLE_FRAMES) {
          // Returned to rest — attempt to count rep
          const timeSinceLast = now - st.lastRepTime;
          const validInterval = timeSinceLast >= C.MIN_REP_INTERVAL_MS;
          const validTravel = isValidRepTravel(st.peakAngle);
          const validTarget = st.targetConfirmedThisRep;

          if (validInterval && validTravel && validTarget) {
            st.repCount += 1;
            st.lastRepTime = now;
          }

          // Always reset for the next rep regardless
          st.phase = "AT_REST";
          st.zoneFrames = 0;
          st.targetConfirmedThisRep = false;
          st.peakAngle = motionTrend === "higher_is_target" ? -Infinity : Infinity;
        }
      }
    },
    [hasLeftRestZone, hasLeftTargetZone, isAtRestZone, isAtTargetZone, isValidRepTravel, motionTrend]
  );

  // ── Get configured points from landmark array ──────────────────────────────
  const getLandmarks = useCallback(
    (
      landmarks: Landmark[],
      points: [string, string, string]
    ): { a: Landmark; b: Landmark; c: Landmark } | null => {
      const [pA, pB, pC] = points;
      const a = landmarks[LANDMARK_INDEX[pA]];
      const b = landmarks[LANDMARK_INDEX[pB]];
      const c = landmarks[LANDMARK_INDEX[pC]];

      if (!a || !b || !c) return null;
      if ((a.visibility ?? 0) < C.MIN_VISIBILITY) return null;
      if ((b.visibility ?? 0) < C.MIN_VISIBILITY) return null;
      if ((c.visibility ?? 0) < C.MIN_VISIBILITY) return null;

      return { a, b, c };
    },
    []
  );

  // ── Process a single MediaPipe frame ──────────────────────────────────────
  const processFrame = useCallback(
    (landmarks: Landmark[]): CounterOutput | null => {
      const now = Date.now();

      // Try to get angle for the configured side only
      // (bilateral counting via min() caused spurious counts — disabled)
      const pts = getLandmarks(landmarks, configuredPoints);
      if (!pts) return null;

      const side = configuredSide;
      const st = stateRef.current.sides[side];

      const rawAngle = calculateAngle(pts.a, pts.b, pts.c);

      // EMA smoothing
      const prevSmoothed = st.smoothedAngle;
      const smoothed =
        prevSmoothed === null
          ? rawAngle
          : prevSmoothed * (1 - C.SMOOTHING_ALPHA) + rawAngle * C.SMOOTHING_ALPHA;

      // Velocity gating: skip frames that jump too fast (noise/occlusion)
      const dtSec = st.lastFrameTime > 0 ? (now - st.lastFrameTime) / 1000 : 0;
      const velocity =
        prevSmoothed !== null && dtSec > 0
          ? Math.abs(smoothed - prevSmoothed) / dtSec
          : 0;

      if (dtSec > 0 && velocity > C.MAX_VELOCITY_DPS) {
        // Frame rejected — too fast to be real
        st.lastFrameTime = now;
        return null;
      }

      st.smoothedAngle = smoothed;
      st.lastFrameTime = now;

      // Run state machine
      updateSide(side, smoothed);

      // Also try the mirror side for visual tracking (but don't count reps from it)
      const mirrorPts = getLandmarks(landmarks, mirroredPoints);
      const mirrorSide: "left" | "right" = configuredSide === "left" ? "right" : "left";
      if (mirrorPts) {
        const mirrorRaw = calculateAngle(mirrorPts.a, mirrorPts.b, mirrorPts.c);
        const mirrorSt = stateRef.current.sides[mirrorSide];
        mirrorSt.smoothedAngle =
          mirrorSt.smoothedAngle === null
            ? mirrorRaw
            : mirrorSt.smoothedAngle * (1 - C.SMOOTHING_ALPHA) + mirrorRaw * C.SMOOTHING_ALPHA;
        mirrorSt.lastFrameTime = now;
      }

      stateRef.current.activeSide = side;

      // ── Build output ───────────────────────────────────────────────────────
      const baseline = stateRef.current.baselineAngle;
      const calibrated = baseline !== null;
      const postureScore = calibrated ? getPostureScore(smoothed) : 0;

      let score = 0;
      let quality = "poor";
      if (baseline !== null) {
        const pq = computeProgressiveScoreAndQuality(
          smoothed,
          baseline,
          config.target_angle,
          motionTrend
        );
        score = pq.score;
        quality = pq.quality;
      }

      const leftSt = stateRef.current.sides.left;
      const rightSt = stateRef.current.sides.right;

      const targetReached =
        st.phase === "AT_TARGET" || st.phase === "RETURNING" || st.targetConfirmedThisRep;
      const startReached = st.phase === "AT_REST";
      const currentState: MovementState =
        st.phase === "AT_TARGET" || st.phase === "RETURNING" ? "UP" : "DOWN";

      const lPosture =
        leftSt.smoothedAngle !== null ? getPostureScore(leftSt.smoothedAngle) : 0;
      const rPosture =
        rightSt.smoothedAngle !== null ? getPostureScore(rightSt.smoothedAngle) : 0;

      const result: CounterOutput = {
        repCount: st.repCount,
        currentState,
        currentAngle: smoothed,
        score,
        quality,
        debug: {
          maxAngle: motionTrend === "higher_is_target" ? (st.peakAngle === -Infinity ? 0 : st.peakAngle) : smoothed,
          minAngle: motionTrend === "lower_is_target" ? (st.peakAngle === Infinity ? 180 : st.peakAngle) : smoothed,
          velocity,
          lastFrameTime: now,
          activeSide: side,
          calibrated,
          upThreshold: targetZoneThreshold,
          downThreshold: baseline !== null ? baseline + C.AT_REST_MARGIN : 0,
          motionTrend,
          targetReached,
          startReached,
          postureScore,
          leftRepCount: configuredSide === "left" ? leftSt.repCount : 0,
          rightRepCount: configuredSide === "right" ? rightSt.repCount : 0,
          leftPostureScore: lPosture,
          rightPostureScore: rPosture,
        },
      };

      setOutput(result);
      return result;
    },
    [
      configuredPoints,
      configuredSide,
      getPostureScore,
      getLandmarks,
      mirroredPoints,
      motionTrend,
      targetZoneThreshold,
      updateSide,
    ]
  );

  // ── Reset all state ────────────────────────────────────────────────────────
  const resetCounter = useCallback(() => {
    stateRef.current = {
      baselineSamples: [],
      baselineEndTime: 0,
      baselineAngle: null,
      activeSide: configuredSide,
      sides: {
        left: buildSideState(),
        right: buildSideState(),
      },
    };

    setOutput({
      repCount: 0,
      currentState: "DOWN",
      currentAngle: 0,
      score: 0,
      quality: "poor",
      debug: {
        maxAngle: 0,
        minAngle: 180,
        velocity: 0,
        lastFrameTime: 0,
        activeSide: configuredSide,
        calibrated: false,
        upThreshold: config.target_angle - config.threshold,
        downThreshold: 0,
        motionTrend,
        targetReached: false,
        startReached: true,
        postureScore: 0,
        leftRepCount: 0,
        rightRepCount: 0,
        leftPostureScore: 0,
        rightPostureScore: 0,
      },
    });
  }, [config.target_angle, config.threshold, configuredSide, motionTrend]);

  return { output, processFrame, resetCounter };
};

// ─── Convenience alias ────────────────────────────────────────────────────────

export const useShoulderFlexionCounter = (options?: ShoulderFlexionOptions) =>
  useExerciseCounter({
    ...options,
    angleConfig: DEFAULT_ANGLE_CONFIG,
  });
