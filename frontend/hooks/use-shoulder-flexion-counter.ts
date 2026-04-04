import { useRef, useCallback, useMemo, useState } from "react";

// Types for MediaPipe landmarks
export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export type MovementState = "DOWN" | "UP";
type MotionTrend = "higher_is_target" | "lower_is_target";
type SideName = "left" | "right";

interface SideState {
  currentState: MovementState;
  repCount: number;
  lastRepTime: number;
  maxAngle: number;
  minAngle: number;
  smoothedAngle: number | null;
  lastFrameTime: number;
  upFrameCount: number;
  downFrameCount: number;
}

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
    motionTrend: MotionTrend;
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

export interface ExerciseAngleConfig {
  joint: string;
  points: [string, string, string] | string[];
  target_angle: number;
  threshold: number;
}

interface ExerciseCounterOptions extends ShoulderFlexionOptions {
  angleConfig?: ExerciseAngleConfig;
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

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const normalizeAngleConfig = (input?: ExerciseAngleConfig): ExerciseAngleConfig => {
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

const getConfiguredSide = (joint: string): "left" | "right" => {
  if (joint.startsWith("left_")) return "left";
  return "right";
};

const getDefaultMotionTrend = (targetAngle: number): MotionTrend =>
  targetAngle >= 95 ? "higher_is_target" : "lower_is_target";

const mirrorLandmarkName = (point: string): string => {
  if (point.startsWith("left_")) return point.replace("left_", "right_");
  if (point.startsWith("right_")) return point.replace("right_", "left_");
  return point;
};

const buildSideState = (): SideState => ({
  currentState: "DOWN",
  repCount: 0,
  lastRepTime: 0,
  maxAngle: 0,
  minAngle: 180,
  smoothedAngle: null,
  lastFrameTime: 0,
  upFrameCount: 0,
  downFrameCount: 0,
});

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

export const useExerciseCounter = (options?: ExerciseCounterOptions) => {
  const enableCalibration = options?.enableCalibration ?? true;
  const calibrationWindowMs = options?.calibrationWindowMs ?? CONSTANTS.CALIBRATION_WINDOW_MS;
  const config = useMemo(
    () => normalizeAngleConfig(options?.angleConfig),
    [options?.angleConfig]
  );

  const thresholdConfig = useMemo(() => {
    const configuredSide = getConfiguredSide(config.joint);
    const motionTrend = getDefaultMotionTrend(config.target_angle);
    const hysteresisGap = Math.max(20, config.threshold * 2);

    let defaultUpThreshold = 150;
    let defaultDownThreshold = 40;
    let defaultValidRepMax = 145;
    let defaultValidRepMin = 45;

    if (motionTrend === "higher_is_target") {
      const rawUpThreshold = clamp(
        config.target_angle - config.threshold,
        15,
        175
      );
      const rawDownThreshold = clamp(
        rawUpThreshold - hysteresisGap,
        5,
        150
      );
      defaultUpThreshold = Math.max(rawUpThreshold, rawDownThreshold + 20);
      defaultDownThreshold = Math.min(rawDownThreshold, defaultUpThreshold - 20);
      defaultValidRepMax = Math.max(10, defaultUpThreshold - 2);
      defaultValidRepMin = Math.min(170, defaultDownThreshold + 4);
    } else {
      const rawTargetThreshold = clamp(
        config.target_angle + config.threshold,
        5,
        170
      );
      const rawStartThreshold = clamp(
        rawTargetThreshold + hysteresisGap,
        20,
        175
      );
      defaultUpThreshold = Math.max(rawStartThreshold, rawTargetThreshold + 20);
      defaultDownThreshold = Math.min(rawTargetThreshold, defaultUpThreshold - 20);
      defaultValidRepMax = Math.max(20, defaultUpThreshold - 4);
      defaultValidRepMin = Math.min(170, defaultDownThreshold + 4);
    }

    return {
      configuredSide,
      motionTrend,
      defaultUpThreshold,
      defaultDownThreshold,
      defaultValidRepMax,
      defaultValidRepMin,
    };
  }, [config.joint, config.target_angle, config.threshold]);

  const {
    configuredSide,
    motionTrend,
    defaultUpThreshold,
    defaultDownThreshold,
    defaultValidRepMax,
    defaultValidRepMin,
  } = thresholdConfig;

  const sideConfig = useMemo(() => {
    const hasLaterality =
      config.joint.startsWith("left_") ||
      config.joint.startsWith("right_") ||
      config.points.some((p) => p.startsWith("left_") || p.startsWith("right_"));

    const configuredPoints = [config.points[0], config.points[1], config.points[2]];
    const mirroredPoints = configuredPoints.map((point) => mirrorLandmarkName(point));
    const supportsBilateral = hasLaterality;

    return {
      supportsBilateral,
      configuredPoints,
      mirroredPoints,
    };
  }, [config.joint, config.points]);

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
        activeSide: configuredSide,
      calibrated: !enableCalibration,
        upThreshold: defaultUpThreshold,
        downThreshold: defaultDownThreshold,
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

  // 12. Use useRef for persistent values to avoid unnecessary re-renders
  const stateRef = useRef({
    activeSide: configuredSide as "left" | "right",
    calibrated: !enableCalibration,
    calibrationStartTime: 0,
    calibrationMinAngle: 180,
    calibrationMaxAngle: 0,
    upThreshold: defaultUpThreshold,
    downThreshold: defaultDownThreshold,
    motionTrend,
    validRepMinAngle: defaultValidRepMin,
    validRepMaxAngle: defaultValidRepMax,
    sides: {
      left: buildSideState(),
      right: buildSideState(),
    } as Record<SideName, SideState>,
  });

  const isTargetReached = useCallback((angle: number) => {
    if (stateRef.current.motionTrend === "higher_is_target") {
      return angle >= stateRef.current.upThreshold;
    }
    return angle <= stateRef.current.downThreshold;
  }, []);

  const isStartReached = useCallback((angle: number) => {
    if (stateRef.current.motionTrend === "higher_is_target") {
      return angle <= stateRef.current.downThreshold;
    }
    return angle >= stateRef.current.upThreshold;
  }, []);

  const getPostureScore = useCallback((angle: number) => {
    const range = Math.max(1, stateRef.current.upThreshold - stateRef.current.downThreshold);
    let progress = 0;
    if (stateRef.current.motionTrend === "higher_is_target") {
      progress = (angle - stateRef.current.downThreshold) / range;
    } else {
      progress = (stateRef.current.upThreshold - angle) / range;
    }
    return Math.round(clamp(progress, 0, 1) * 100);
  }, []);

  const resetCounter = useCallback(() => {
    stateRef.current = {
      activeSide: configuredSide,
      calibrated: !enableCalibration,
      calibrationStartTime: 0,
      calibrationMinAngle: 180,
      calibrationMaxAngle: 0,
      upThreshold: defaultUpThreshold,
      downThreshold: defaultDownThreshold,
      motionTrend,
      validRepMinAngle: defaultValidRepMin,
      validRepMaxAngle: defaultValidRepMax,
      sides: {
        left: buildSideState(),
        right: buildSideState(),
      },
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
        activeSide: configuredSide,
        calibrated: !enableCalibration,
        upThreshold: defaultUpThreshold,
        downThreshold: defaultDownThreshold,
        motionTrend,
        targetReached: false,
        startReached: true,
        postureScore: 0,
        leftRepCount: 0,
        rightRepCount: 0,
        leftPostureScore: 0,
        rightPostureScore: 0,
      },
    })
  }, [configuredSide, defaultDownThreshold, defaultUpThreshold, defaultValidRepMax, defaultValidRepMin, enableCalibration, motionTrend])

  const smoothAngle = (side: SideName, currentRawIndex: number): number => {
    const sideState = stateRef.current.sides[side];
    let currentSmoothedAngle = currentRawIndex;
    if (sideState.smoothedAngle !== null) {
      // 3. Add ANGLE SMOOTHING
      currentSmoothedAngle =
        sideState.smoothedAngle * (1 - CONSTANTS.SMOOTHING_FACTOR) +
        currentRawIndex * CONSTANTS.SMOOTHING_FACTOR;
    }
    sideState.smoothedAngle = currentSmoothedAngle;
    return currentSmoothedAngle;
  };

  const shouldCountRep = (side: SideName): boolean => {
    const now = Date.now();
    const { maxAngle, minAngle, lastRepTime } = stateRef.current.sides[side];
    
    // 7. Add RANGE VALIDATION (Must hit full ROM: >150 and <50)
    const validRange =
      stateRef.current.motionTrend === "higher_is_target"
        ? maxAngle >= stateRef.current.validRepMaxAngle &&
          minAngle <= stateRef.current.validRepMinAngle
        : minAngle <= stateRef.current.validRepMinAngle &&
          maxAngle >= stateRef.current.validRepMaxAngle;
    // 5. Add TIME-BASED DEBOUNCE (800ms between reps)
    const dbounced = now - lastRepTime >= CONSTANTS.MIN_TIME_BETWEEN_REPS_MS;

    return validRange && dbounced;
  };

  const updateState = (side: SideName, angle: number) => {
    const now = Date.now();
    const sideState = stateRef.current.sides[side];
    const { currentState } = sideState;

    // Track min/max for the current rep cycle
    if (angle > sideState.maxAngle) sideState.maxAngle = angle;
    if (angle < sideState.minAngle) sideState.minAngle = angle;

    // 1. STATE MACHINE with 4. HYSTERESIS thresholds
    if (currentState === "DOWN") {
      if (isTargetReached(angle)) {
        sideState.upFrameCount += 1;
      } else {
        sideState.upFrameCount = 0;
      }

      if (sideState.upFrameCount >= CONSTANTS.REQUIRED_STABLE_FRAMES) {
        // Transition DOWN -> UP only after stable frames above threshold.
        sideState.currentState = "UP";
        sideState.upFrameCount = 0;
      }
      return;
    }

    if (currentState === "UP") {
      if (isStartReached(angle)) {
        sideState.downFrameCount += 1;
      } else {
        sideState.downFrameCount = 0;
      }

      if (sideState.downFrameCount < CONSTANTS.REQUIRED_STABLE_FRAMES) {
        return;
      }

      // Transition UP -> DOWN (Complete rep cycle)
      
      // 6. Add REP COOLDOWN (Don't count if we just counted one ~600ms ago)
      if (now - sideState.lastRepTime >= CONSTANTS.REP_COOLDOWN_MS) {
        if (shouldCountRep(side)) {
          sideState.repCount += 1;
          sideState.lastRepTime = now;
        }
      }
      
      // Reset state for next rep
      sideState.currentState = "DOWN";
      sideState.downFrameCount = 0;
      // Reset range trackers
      sideState.maxAngle = 0;
      sideState.minAngle = 180;
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

    const nearMax = Math.abs(config.target_angle - max);
    const nearMin = Math.abs(config.target_angle - min);
    stateRef.current.motionTrend = nearMax <= nearMin ? "higher_is_target" : "lower_is_target";

    if (stateRef.current.motionTrend === "higher_is_target") {
      const upThreshold = Math.min(175, Math.max(95, max - range * 0.12));
      const downThreshold = Math.max(8, Math.min(120, min + range * 0.12));
      const minGap = 25;
      const adjustedUp = Math.max(upThreshold, downThreshold + minGap);
      const adjustedDown = Math.min(downThreshold, adjustedUp - minGap);

      stateRef.current.upThreshold = adjustedUp;
      stateRef.current.downThreshold = adjustedDown;
      stateRef.current.validRepMaxAngle = Math.max(90, adjustedUp - 4);
      stateRef.current.validRepMinAngle = Math.min(130, adjustedDown + 6);
    } else {
      const targetThreshold = clamp(min + range * 0.18, 5, 170);
      const startThreshold = clamp(max - range * 0.18, 20, 175);
      const minGap = 25;
      const adjustedUp = Math.max(startThreshold, targetThreshold + minGap);
      const adjustedDown = Math.min(targetThreshold, adjustedUp - minGap);

      stateRef.current.upThreshold = adjustedUp;
      stateRef.current.downThreshold = adjustedDown;
      stateRef.current.validRepMaxAngle = Math.max(20, adjustedUp - 4);
      stateRef.current.validRepMinAngle = Math.min(170, adjustedDown + 6);
    }

    stateRef.current.calibrated = true;
  };

  const getConfiguredPoints = useCallback(
    (landmarks: Landmark[], points: [string, string, string]) => {
      const [pointA, pointB, pointC] = points;
      const indexA = LANDMARK_INDEX[pointA];
      const indexB = LANDMARK_INDEX[pointB];
      const indexC = LANDMARK_INDEX[pointC];

      return {
        pointA: typeof indexA === "number" ? landmarks[indexA] : undefined,
        pointB: typeof indexB === "number" ? landmarks[indexB] : undefined,
        pointC: typeof indexC === "number" ? landmarks[indexC] : undefined,
      };
    },
    []
  );

  const getProgressRatio = useCallback((angle: number) => {
    const range = Math.max(1, stateRef.current.upThreshold - stateRef.current.downThreshold);
    if (stateRef.current.motionTrend === "higher_is_target") {
      return clamp((angle - stateRef.current.downThreshold) / range, 0, 1);
    }
    return clamp((stateRef.current.upThreshold - angle) / range, 0, 1);
  }, []);

  const processFrame = useCallback((landmarks: Landmark[]): CounterOutput | null => {
    const now = Date.now();
    const sideInputs: Array<{ side: SideName; points: [string, string, string] }> = [
      { side: configuredSide, points: sideConfig.configuredPoints as [string, string, string] },
    ];
    if (sideConfig.supportsBilateral) {
      sideInputs.push({
        side: configuredSide === "left" ? "right" : "left",
        points: sideConfig.mirroredPoints as [string, string, string],
      });
    }

    let trackedSides = 0;
    let activeAngle = 0;
    let activeVelocity = 0;
    let activeProgress = -1;

    for (const input of sideInputs) {
      const sidePoints = getConfiguredPoints(landmarks, input.points);
      if (
        !sidePoints.pointA || !sidePoints.pointB || !sidePoints.pointC ||
        (sidePoints.pointA.visibility ?? 0) < CONSTANTS.MIN_VISIBILITY ||
        (sidePoints.pointB.visibility ?? 0) < CONSTANTS.MIN_VISIBILITY ||
        (sidePoints.pointC.visibility ?? 0) < CONSTANTS.MIN_VISIBILITY
      ) {
        continue;
      }

      trackedSides += 1;
      const sideState = stateRef.current.sides[input.side];
      const rawAngle = calculateAngle(sidePoints.pointA, sidePoints.pointB, sidePoints.pointC);
      const previousSmoothedAngle = sideState.smoothedAngle;
      const smoothedAngle = smoothAngle(input.side, rawAngle);

      applyCalibrationIfReady(now, smoothedAngle);

      const dtSeconds = (now - sideState.lastFrameTime) / 1000;
      let velocity = 0;
      if (sideState.lastFrameTime > 0 && dtSeconds > 0 && previousSmoothedAngle != null) {
        velocity = Math.abs(smoothedAngle - previousSmoothedAngle) / dtSeconds;
      }
      if (velocity > CONSTANTS.MAX_ANGULAR_VELOCITY) {
        sideState.lastFrameTime = now;
        continue;
      }

      if (enableCalibration && !stateRef.current.calibrated) {
        sideState.lastFrameTime = now;
      } else {
        updateState(input.side, smoothedAngle);
        sideState.lastFrameTime = now;
      }

      const progress = getProgressRatio(smoothedAngle);
      if (progress > activeProgress) {
        activeProgress = progress;
        activeAngle = smoothedAngle;
        activeVelocity = velocity;
        stateRef.current.activeSide = input.side;
      }
    }

    if (trackedSides === 0) {
      return null;
    }

    const leftState = stateRef.current.sides.left;
    const rightState = stateRef.current.sides.right;
    const totalReps = sideConfig.supportsBilateral
      ? Math.min(leftState.repCount, rightState.repCount)
      : stateRef.current.sides[configuredSide].repCount;
    const postureScore = Math.max(
      leftState.smoothedAngle != null ? getPostureScore(leftState.smoothedAngle) : 0,
      rightState.smoothedAngle != null ? getPostureScore(rightState.smoothedAngle) : 0
    );
    const leftPostureScore = leftState.smoothedAngle != null ? getPostureScore(leftState.smoothedAngle) : 0;
    const rightPostureScore = rightState.smoothedAngle != null ? getPostureScore(rightState.smoothedAngle) : 0;
    const targetReached =
      (leftState.smoothedAngle != null && isTargetReached(leftState.smoothedAngle)) ||
      (rightState.smoothedAngle != null && isTargetReached(rightState.smoothedAngle));
    const startReached =
      (leftState.smoothedAngle != null && isStartReached(leftState.smoothedAngle)) ||
      (rightState.smoothedAngle != null && isStartReached(rightState.smoothedAngle));
    const currentState =
      leftState.currentState === "UP" || rightState.currentState === "UP" ? "UP" : "DOWN";

    const activeState = stateRef.current.sides[stateRef.current.activeSide];

    // During calibration, we only measure range and do not run rep state transitions.
    if (enableCalibration && !stateRef.current.calibrated) {
      const calibrationOutput: CounterOutput = {
        repCount: totalReps,
        currentState,
        currentAngle: activeAngle,
        debug: {
          maxAngle: activeState.maxAngle,
          minAngle: activeState.minAngle,
          velocity: activeVelocity,
          lastFrameTime: now,
          activeSide: stateRef.current.activeSide,
          calibrated: stateRef.current.calibrated,
          upThreshold: stateRef.current.upThreshold,
          downThreshold: stateRef.current.downThreshold,
          motionTrend: stateRef.current.motionTrend,
          targetReached,
          startReached,
          postureScore,
          leftRepCount: leftState.repCount,
          rightRepCount: rightState.repCount,
          leftPostureScore,
          rightPostureScore,
        }
      };
      setOutput(calibrationOutput);
      return calibrationOutput;
    }

    // 11. Output
    const frameOutput: CounterOutput = {
      repCount: totalReps,
      currentState,
      currentAngle: activeAngle,
      debug: {
        maxAngle: activeState.maxAngle,
        minAngle: activeState.minAngle,
        velocity: activeVelocity,
        lastFrameTime: now,
        activeSide: stateRef.current.activeSide,
        calibrated: stateRef.current.calibrated,
        upThreshold: stateRef.current.upThreshold,
        downThreshold: stateRef.current.downThreshold,
        motionTrend: stateRef.current.motionTrend,
        targetReached,
        startReached,
        postureScore,
        leftRepCount: leftState.repCount,
        rightRepCount: rightState.repCount,
        leftPostureScore,
        rightPostureScore,
      }
    };
    setOutput(frameOutput);
    return frameOutput;

  }, [calibrationWindowMs, config.target_angle, configuredSide, enableCalibration, getConfiguredPoints, getPostureScore, getProgressRatio, isStartReached, isTargetReached, sideConfig.configuredPoints, sideConfig.mirroredPoints, sideConfig.supportsBilateral]);

  return { output, processFrame, resetCounter };
};

export const useShoulderFlexionCounter = (options?: ShoulderFlexionOptions) =>
  useExerciseCounter({
    ...options,
    angleConfig: DEFAULT_ANGLE_CONFIG,
  });