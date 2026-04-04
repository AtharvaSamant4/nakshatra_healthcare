import { useRef, useCallback, useState } from "react";

// Types for MediaPipe landmarks
export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export type MovementState = "DOWN" | "UP";

interface CounterOutput {
  repCount: number;
  currentState: MovementState;
  currentAngle: number;
  debug: {
    maxAngle: number;
    minAngle: number;
    velocity: number;
    lastFrameTime: number;
    activeSide: "left" | "right";
    calibrated: boolean;
    upThreshold: number;
    downThreshold: number;
  };
}

interface ShoulderFlexionOptions {
  enableCalibration?: boolean;
  calibrationWindowMs?: number;
}

// Configurable constants for shoulder flexion
const CONSTANTS = {
  MIN_VISIBILITY: 0.5,
  // Smoothing: new = (prev * (1 - alpha)) + (current * alpha)
  SMOOTHING_FACTOR: 0.3, 
  ANGLE_THRESHOLD_UP: 160,
  ANGLE_THRESHOLD_DOWN: 40,
  VALID_REP_MIN_ANGLE: 50,
  VALID_REP_MAX_ANGLE: 150,
  MIN_TIME_BETWEEN_REPS_MS: 800,
  REP_COOLDOWN_MS: 600,
  // Degrees per second (ignore unrealistic spikes)
  MAX_ANGULAR_VELOCITY: 800, 
  CALIBRATION_WINDOW_MS: 2500,
  REQUIRED_STABLE_FRAMES: 3,
  SIDE_SWITCH_MARGIN: 0.35,
  MIN_CALIBRATED_RANGE: 25,
};

/**
 * 2. Compute shoulder flexion angle using 3 landmarks
 * A = Hip, B = Shoulder (vertex), C = Elbow
 */
const calculateAngle = (a: Landmark, b: Landmark, c: Landmark): number => {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
};

export const useShoulderFlexionCounter = (options?: ShoulderFlexionOptions) => {
  const enableCalibration = options?.enableCalibration ?? true;
  const calibrationWindowMs = options?.calibrationWindowMs ?? CONSTANTS.CALIBRATION_WINDOW_MS;

  // Output state - updated at animation frame rate but can be throttled
  const [output, setOutput] = useState<CounterOutput>({
    repCount: 0,
    currentState: "DOWN",
    currentAngle: 180, // initial
    debug: {
      maxAngle: 0,
      minAngle: 180,
      velocity: 0,
      lastFrameTime: 0,
      activeSide: "right",
      calibrated: !enableCalibration,
      upThreshold: CONSTANTS.ANGLE_THRESHOLD_UP,
      downThreshold: CONSTANTS.ANGLE_THRESHOLD_DOWN,
    },
  });

  // 12. Use useRef for persistent values to avoid unnecessary re-renders
  const stateRef = useRef({
    currentState: "DOWN" as MovementState,
    repCount: 0,
    lastRepTime: 0,
    maxAngle: 0,
    minAngle: 180, // starting neutral/down
    smoothedAngle: null as number | null,
    lastFrameTime: 0,
    activeSide: "right" as "left" | "right",
    calibrated: !enableCalibration,
    calibrationStartTime: 0,
    calibrationMinAngle: 180,
    calibrationMaxAngle: 0,
    upThreshold: CONSTANTS.ANGLE_THRESHOLD_UP,
    downThreshold: CONSTANTS.ANGLE_THRESHOLD_DOWN,
    validRepMinAngle: CONSTANTS.VALID_REP_MIN_ANGLE,
    validRepMaxAngle: CONSTANTS.VALID_REP_MAX_ANGLE,
    upFrameCount: 0,
    downFrameCount: 0,
  });

  const resetCounter = useCallback(() => {
    stateRef.current = {
      currentState: "DOWN",
      repCount: 0,
      lastRepTime: 0,
      maxAngle: 0,
      minAngle: 180,
      smoothedAngle: null,
      lastFrameTime: 0,
      activeSide: "right",
      calibrated: !enableCalibration,
      calibrationStartTime: 0,
      calibrationMinAngle: 180,
      calibrationMaxAngle: 0,
      upThreshold: CONSTANTS.ANGLE_THRESHOLD_UP,
      downThreshold: CONSTANTS.ANGLE_THRESHOLD_DOWN,
      validRepMinAngle: CONSTANTS.VALID_REP_MIN_ANGLE,
      validRepMaxAngle: CONSTANTS.VALID_REP_MAX_ANGLE,
      upFrameCount: 0,
      downFrameCount: 0,
    }
    setOutput({
      repCount: 0,
      currentState: "DOWN",
      currentAngle: 180,
      debug: {
        maxAngle: 0,
        minAngle: 180,
        velocity: 0,
        lastFrameTime: 0,
        activeSide: "right",
        calibrated: !enableCalibration,
        upThreshold: CONSTANTS.ANGLE_THRESHOLD_UP,
        downThreshold: CONSTANTS.ANGLE_THRESHOLD_DOWN,
      },
    })
  }, [enableCalibration])

  const smoothAngle = (currentRawIndex: number): number => {
    let currentSmoothedAngle = currentRawIndex;
    if (stateRef.current.smoothedAngle !== null) {
      // 3. Add ANGLE SMOOTHING
      currentSmoothedAngle =
        stateRef.current.smoothedAngle * (1 - CONSTANTS.SMOOTHING_FACTOR) +
        currentRawIndex * CONSTANTS.SMOOTHING_FACTOR;
    }
    stateRef.current.smoothedAngle = currentSmoothedAngle;
    return currentSmoothedAngle;
  };

  const shouldCountRep = (): boolean => {
    const now = Date.now();
    const { maxAngle, minAngle, lastRepTime } = stateRef.current;
    
    // 7. Add RANGE VALIDATION (Must hit full ROM: >150 and <50)
    const validRange =
      maxAngle >= stateRef.current.validRepMaxAngle &&
      minAngle <= stateRef.current.validRepMinAngle;
    // 5. Add TIME-BASED DEBOUNCE (800ms between reps)
    const dbounced = now - lastRepTime >= CONSTANTS.MIN_TIME_BETWEEN_REPS_MS;

    return validRange && dbounced;
  };

  const updateState = (angle: number) => {
    const now = Date.now();
    const { currentState } = stateRef.current;

    // Track min/max for the current rep cycle
    if (angle > stateRef.current.maxAngle) stateRef.current.maxAngle = angle;
    if (angle < stateRef.current.minAngle) stateRef.current.minAngle = angle;

    // 1. STATE MACHINE with 4. HYSTERESIS thresholds
    if (currentState === "DOWN") {
      if (angle > stateRef.current.upThreshold) {
        stateRef.current.upFrameCount += 1;
      } else {
        stateRef.current.upFrameCount = 0;
      }

      if (stateRef.current.upFrameCount >= CONSTANTS.REQUIRED_STABLE_FRAMES) {
        // Transition DOWN -> UP only after stable frames above threshold.
        stateRef.current.currentState = "UP";
        stateRef.current.upFrameCount = 0;
      }
      return;
    }

    if (currentState === "UP") {
      if (angle < stateRef.current.downThreshold) {
        stateRef.current.downFrameCount += 1;
      } else {
        stateRef.current.downFrameCount = 0;
      }

      if (stateRef.current.downFrameCount < CONSTANTS.REQUIRED_STABLE_FRAMES) {
        return;
      }

      // Transition UP -> DOWN (Complete rep cycle)
      
      // 6. Add REP COOLDOWN (Don't count if we just counted one ~600ms ago)
      if (now - stateRef.current.lastRepTime >= CONSTANTS.REP_COOLDOWN_MS) {
        if (shouldCountRep()) {
          stateRef.current.repCount += 1;
          stateRef.current.lastRepTime = now;
        }
      }
      
      // Reset state for next rep
      stateRef.current.currentState = "DOWN";
      stateRef.current.downFrameCount = 0;
      // Reset range trackers
      stateRef.current.maxAngle = 0;
      stateRef.current.minAngle = 180;
    }
  };

  const applyCalibrationIfReady = (now: number, angle: number) => {
    if (!enableCalibration || stateRef.current.calibrated) return;

    if (stateRef.current.calibrationStartTime === 0) {
      stateRef.current.calibrationStartTime = now;
    }

    if (angle < stateRef.current.calibrationMinAngle) stateRef.current.calibrationMinAngle = angle;
    if (angle > stateRef.current.calibrationMaxAngle) stateRef.current.calibrationMaxAngle = angle;

    const elapsed = now - stateRef.current.calibrationStartTime;
    if (elapsed < calibrationWindowMs) return;

    const min = stateRef.current.calibrationMinAngle;
    const max = stateRef.current.calibrationMaxAngle;

    const range = max - min;

    // If user did not move enough during calibration, keep safe defaults.
    if (range < CONSTANTS.MIN_CALIBRATED_RANGE) {
      stateRef.current.calibrated = true;
      return;
    }

    // Dynamic thresholds with margins based on observed ROM.
    const upThreshold = Math.min(175, Math.max(95, max - range * 0.12));
    const downThreshold = Math.max(8, Math.min(120, min + range * 0.12));

    // Ensure enough hysteresis separation.
    const minGap = 25;
    const adjustedUp = Math.max(upThreshold, downThreshold + minGap);
    const adjustedDown = Math.min(downThreshold, adjustedUp - minGap);

    stateRef.current.upThreshold = adjustedUp;
    stateRef.current.downThreshold = adjustedDown;
    stateRef.current.validRepMaxAngle = Math.max(90, adjustedUp - 4);
    stateRef.current.validRepMinAngle = Math.min(130, adjustedDown + 6);
    stateRef.current.calibrated = true;
  };

  const getBestArmLandmarks = (landmarks: Landmark[]) => {
    const left = {
      hip: landmarks[23],
      shoulder: landmarks[11],
      elbow: landmarks[13],
    };
    const right = {
      hip: landmarks[24],
      shoulder: landmarks[12],
      elbow: landmarks[14],
    };

    const leftScore =
      (left.hip?.visibility ?? 0) +
      (left.shoulder?.visibility ?? 0) +
      (left.elbow?.visibility ?? 0);
    const rightScore =
      (right.hip?.visibility ?? 0) +
      (right.shoulder?.visibility ?? 0) +
      (right.elbow?.visibility ?? 0);

    const leftConfidenceOk =
      !!left.hip &&
      !!left.shoulder &&
      !!left.elbow &&
      (left.hip.visibility ?? 0) >= CONSTANTS.MIN_VISIBILITY &&
      (left.shoulder.visibility ?? 0) >= CONSTANTS.MIN_VISIBILITY &&
      (left.elbow.visibility ?? 0) >= CONSTANTS.MIN_VISIBILITY;

    const rightConfidenceOk =
      !!right.hip &&
      !!right.shoulder &&
      !!right.elbow &&
      (right.hip.visibility ?? 0) >= CONSTANTS.MIN_VISIBILITY &&
      (right.shoulder.visibility ?? 0) >= CONSTANTS.MIN_VISIBILITY &&
      (right.elbow.visibility ?? 0) >= CONSTANTS.MIN_VISIBILITY;

    const leftAngle = leftConfidenceOk ? calculateAngle(left.hip, left.shoulder, left.elbow) : null;
    const rightAngle = rightConfidenceOk ? calculateAngle(right.hip, right.shoulder, right.elbow) : null;

    const currentSide = stateRef.current.activeSide;
    const currentScore = currentSide === "left" ? leftScore : rightScore;
    const otherScore = currentSide === "left" ? rightScore : leftScore;

    // Prefer the arm with higher angle while in DOWN phase (the one likely being actively lifted).
    if (
      stateRef.current.currentState === "DOWN" &&
      leftAngle != null &&
      rightAngle != null
    ) {
      const scoreGap = Math.abs(leftScore - rightScore);
      if (scoreGap < 0.9) {
        stateRef.current.activeSide = leftAngle >= rightAngle ? "left" : "right";
      }
    }

    // Keep current side unless the other side is clearly better.
    // Also avoid switching during UP phase so one rep uses one arm consistently.
    if (
      stateRef.current.currentState === "DOWN" &&
      otherScore - currentScore > CONSTANTS.SIDE_SWITCH_MARGIN
    ) {
      stateRef.current.activeSide = currentSide === "left" ? "right" : "left";
      // Reset smoothing to avoid artificial spikes when switching sides.
      stateRef.current.smoothedAngle = null;
    }

    if (stateRef.current.activeSide === "left") {
      return {
        side: "left" as const,
        hip: left.hip,
        shoulder: left.shoulder,
        elbow: left.elbow,
      };
    }

    return {
      side: "right" as const,
      hip: right.hip,
      shoulder: right.shoulder,
      elbow: right.elbow,
    };
  };

  const processFrame = useCallback((landmarks: Landmark[]): CounterOutput | null => {
    const now = Date.now();
    const activeArm = getBestArmLandmarks(landmarks);
    stateRef.current.activeSide = activeArm.side;

    // 9. Add LANDMARK CONFIDENCE CHECK
    if (
      !activeArm.hip || !activeArm.shoulder || !activeArm.elbow ||
      (activeArm.hip.visibility ?? 0) < CONSTANTS.MIN_VISIBILITY ||
      (activeArm.shoulder.visibility ?? 0) < CONSTANTS.MIN_VISIBILITY ||
      (activeArm.elbow.visibility ?? 0) < CONSTANTS.MIN_VISIBILITY
    ) {
      return null; // Skip noisy/unseen frames
    }

    const rawAngle = calculateAngle(activeArm.hip, activeArm.shoulder, activeArm.elbow);
    const previousSmoothedAngle = stateRef.current.smoothedAngle
    const smoothedAngle = smoothAngle(rawAngle);

    applyCalibrationIfReady(now, smoothedAngle);

    // 8. Add VELOCITY FILTER
    const dtSeconds = (now - stateRef.current.lastFrameTime) / 1000;
    let velocity = 0;
    
    if (stateRef.current.lastFrameTime > 0 && dtSeconds > 0 && previousSmoothedAngle != null) {
      velocity = Math.abs(smoothedAngle - previousSmoothedAngle) / dtSeconds;
      
      if (velocity > CONSTANTS.MAX_ANGULAR_VELOCITY) {
        // Excessive velocity detected, ignore frame data as it's likely a tracking error
        stateRef.current.lastFrameTime = now;
        return null;
      }
    }

    // During calibration, we only measure range and do not run rep state transitions.
    if (enableCalibration && !stateRef.current.calibrated) {
      stateRef.current.lastFrameTime = now;
      const calibrationOutput: CounterOutput = {
        repCount: stateRef.current.repCount,
        currentState: stateRef.current.currentState,
        currentAngle: smoothedAngle,
        debug: {
          maxAngle: stateRef.current.maxAngle,
          minAngle: stateRef.current.minAngle,
          velocity: velocity,
          lastFrameTime: now,
          activeSide: stateRef.current.activeSide,
          calibrated: stateRef.current.calibrated,
          upThreshold: stateRef.current.upThreshold,
          downThreshold: stateRef.current.downThreshold,
        }
      };
      setOutput(calibrationOutput);
      return calibrationOutput;
    }

    // Process State Machine Logic
    updateState(smoothedAngle);

    stateRef.current.lastFrameTime = now;

    // 11. Output
    const frameOutput: CounterOutput = {
      repCount: stateRef.current.repCount,
      currentState: stateRef.current.currentState,
      currentAngle: smoothedAngle,
      debug: {
        maxAngle: stateRef.current.maxAngle,
        minAngle: stateRef.current.minAngle,
        velocity: velocity,
        lastFrameTime: now,
        activeSide: stateRef.current.activeSide,
        calibrated: stateRef.current.calibrated,
        upThreshold: stateRef.current.upThreshold,
        downThreshold: stateRef.current.downThreshold,
      }
    };
    setOutput(frameOutput);
    return frameOutput;

  }, [calibrationWindowMs, enableCalibration]);

  return { output, processFrame, resetCounter };
};