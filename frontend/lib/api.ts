// All backend API calls go through this file.
// Base URL comes from NEXT_PUBLIC_API_URL env var (default: http://localhost:8000)

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "")

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error"
    throw new Error(`Network request failed for ${BASE}${path}: ${message}`)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function requestWithFallback<T>(
  path: string,
  fallback: T,
  context: string,
  options?: RequestInit
): Promise<T> {
  try {
    return await request<T>(path, options)
  } catch (error) {
    console.warn(`${context} unavailable. Using fallback data.`, error)
    return fallback
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email?: string
  age?: number
  condition_notes?: string
  created_at: string
}

export interface UserListItem {
  id: string
  name: string
  created_at: string
}

export interface AngleConfig {
  joint: string
  points: string[]
  target_angle: number
  threshold: number
}

export interface Exercise {
  id: string
  name: string
  description?: string
  body_part: string
  difficulty: string
  angle_config: AngleConfig
  instructions?: string
  thumbnail_url?: string
}

const DEFAULT_EXERCISES: Exercise[] = [
  {
    id: "a1000001-0001-4000-8000-000000000001",
    name: "Shoulder Flexion",
    description: "Raise your arm forward and upward",
    body_part: "shoulder",
    difficulty: "beginner",
    angle_config: {
      joint: "left_shoulder",
      points: ["left_elbow", "left_shoulder", "left_hip"],
      target_angle: 160,
      threshold: 15,
    },
    instructions:
      "Stand with arms at your side. Slowly raise your arm forward to shoulder height, then continue upward as far as comfortable. Lower slowly.",
    thumbnail_url: "/images/shoulder-flexion.png",
  },
  {
    id: "a1000001-0001-4000-8000-000000000002",
    name: "Shoulder Abduction",
    description: "Raise your arm out to the side",
    body_part: "shoulder",
    difficulty: "beginner",
    angle_config: {
      joint: "right_shoulder",
      points: ["right_elbow", "right_shoulder", "right_hip"],
      target_angle: 150,
      threshold: 15,
    },
    instructions:
      "Stand upright with arms at your side. Slowly raise one arm out to the side until it is level with your shoulder. Hold briefly, then lower slowly.",
    thumbnail_url: "/images/shoulder-abduction.png",
  },
  {
    id: "a1000001-0001-4000-8000-000000000003",
    name: "Elbow Flexion",
    description: "Bend and straighten your elbow",
    body_part: "elbow",
    difficulty: "beginner",
    angle_config: {
      joint: "right_elbow",
      points: ["right_wrist", "right_elbow", "right_shoulder"],
      target_angle: 45,
      threshold: 15,
    },
    instructions:
      "Hold your arm at your side with elbow straight. Slowly bend your elbow, bringing your hand toward your shoulder. Straighten slowly and repeat.",
    thumbnail_url: "/images/elbow-flexion.png",
  },
  {
    id: "a1000001-0001-4000-8000-000000000004",
    name: "Knee Extension",
    description: "Straighten your knee from a seated position",
    body_part: "knee",
    difficulty: "beginner",
    angle_config: {
      joint: "right_knee",
      points: ["right_ankle", "right_knee", "right_hip"],
      target_angle: 170,
      threshold: 10,
    },
    instructions:
      "Sit upright on a chair. Slowly straighten your knee until your leg is extended. Hold for 2 seconds, then lower slowly.",
    thumbnail_url: "/images/knee-extension.png",
  },
  {
    id: "a1000001-0001-4000-8000-000000000005",
    name: "Knee Flexion",
    description: "Bend your knee as far as comfortable",
    body_part: "knee",
    difficulty: "intermediate",
    angle_config: {
      joint: "right_knee",
      points: ["right_ankle", "right_knee", "right_hip"],
      target_angle: 90,
      threshold: 15,
    },
    instructions:
      "Stand holding a support. Slowly bend your knee, bringing your heel toward your buttocks. Hold briefly, then lower slowly.",
    thumbnail_url: "/images/knee-flexion.png",
  },
  {
    id: "a1000001-0001-4000-8000-000000000006",
    name: "Hip Abduction",
    description: "Raise your leg out to the side",
    body_part: "hip",
    difficulty: "intermediate",
    angle_config: {
      joint: "right_hip",
      points: ["right_knee", "right_hip", "left_hip"],
      target_angle: 30,
      threshold: 10,
    },
    instructions:
      "Stand upright, holding a support for balance. Slowly raise one leg out to the side, keeping your toe pointed forward. Lower slowly.",
    thumbnail_url: "/images/hip-abduction.png",
  },
  {
    id: "a1000001-0001-4000-8000-000000000007",
    name: "Shoulder External Rotation",
    description: "Rotate your shoulder outward with elbow bent",
    body_part: "shoulder",
    difficulty: "intermediate",
    angle_config: {
      joint: "right_shoulder",
      points: ["right_wrist", "right_elbow", "right_shoulder"],
      target_angle: 90,
      threshold: 15,
    },
    instructions:
      "Hold your elbow at 90° at your side. Rotate your forearm outward, keeping your elbow tucked. Return slowly.",
    thumbnail_url: "/images/shoulder-external-rotation.png",
  },
  {
    id: "a1000001-0001-4000-8000-000000000008",
    name: "Straight Leg Raise",
    description: "Lift your straight leg from a lying position",
    body_part: "hip",
    difficulty: "beginner",
    angle_config: {
      joint: "right_hip",
      points: ["right_knee", "right_hip", "left_shoulder"],
      target_angle: 45,
      threshold: 10,
    },
    instructions:
      "Lie flat on your back. Keep one knee bent with foot flat. Tighten the thigh of the other leg and raise it to the height of the bent knee. Lower slowly.",
    thumbnail_url: "/images/straight-leg-raise.png",
  },
]

export interface AngleHistoryItem {
  rep: number
  peak_angle: number
}

export interface CreateSessionPayload {
  user_id: string
  exercise_id: string
  reps_completed: number
  avg_angle?: number
  min_angle?: number
  max_angle?: number
  form_score?: number
  duration_seconds?: number
  angle_history?: AngleHistoryItem[]
  started_at: string
  completed_at: string
}

export interface SessionCreateResponse {
  id: string
  user_id: string
  exercise_id: string
  reps_completed: number
  avg_angle?: number
  min_angle?: number
  max_angle?: number
  form_score?: number
  duration_seconds?: number
  started_at: string
  completed_at: string
  feedback_id: string
}

export interface SessionListItem {
  id: string
  exercise_name?: string
  reps_completed: number
  form_score?: number
  duration_seconds?: number
  completed_at: string
}

export interface SessionListResponse {
  sessions: SessionListItem[]
  total: number
}

export interface CreateGameSessionPayload {
  user_id: string
  game_type: "memory" | "reaction" | "pattern"
  score: number
  accuracy?: number
  avg_reaction_ms?: number
  level_reached?: number
  duration_seconds?: number
  game_metadata?: Record<string, unknown>
}

export interface GameSessionCreateResponse {
  id: string
  user_id: string
  game_type: string
  score: number
  accuracy?: number
  level_reached?: number
  duration_seconds?: number
  completed_at: string
  feedback_id: string
}

export interface GameSessionListItem {
  id: string
  game_type: string
  score: number
  accuracy?: number
  duration_seconds?: number
  completed_at: string
}

export interface GameSessionListResponse {
  sessions: GameSessionListItem[]
  total: number
}

export interface FeedbackResponse {
  id: string
  session_id: string
  session_type: string
  summary?: string
  tips?: string[]
  encouragement?: string
  focus_areas?: string[]
  recovery_score?: number
  created_at: string
}

export interface FeedbackProcessing {
  status: "processing"
  message: string
}

export interface ProgressSummary {
  total_exercise_sessions: number
  total_game_sessions: number
  total_reps: number
  avg_form_score?: number
  current_streak_days: number
  total_active_days: number
}

export interface ExerciseProgressDay {
  date: string
  sessions: number
  total_reps: number
  avg_form_score?: number
}

export interface GameProgressDay {
  date: string
  game_type: string
  best_score: number
  avg_accuracy?: number
}

export interface RecentFeedbackItem {
  id: string
  session_type: string
  summary?: string
  recovery_score?: number
  created_at: string
}

export interface BodyPartBreakdownItem {
  body_part: string
  sessions: number
  avg_form_score?: number
}

export interface ProgressResponse {
  user_id: string
  summary: ProgressSummary
  exercise_progress: ExerciseProgressDay[]
  game_progress: GameProgressDay[]
  recent_feedback: RecentFeedbackItem[]
  body_part_breakdown: BodyPartBreakdownItem[]
}

export interface ExerciseTrendDay {
  date: string
  avg_angle?: number
  avg_form_score?: number
  total_reps: number
}

export interface ExerciseTrendResponse {
  trend: ExerciseTrendDay[]
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: async () => {
    try {
      return await request<UserListItem[]>("/api/users")
    } catch (error) {
      console.warn("Users API unavailable. Falling back to demo user.", error)
      return [
        {
          id: "demo-user",
          name: "Demo User",
          created_at: new Date().toISOString(),
        },
      ]
    }
  },
  get: (id: string) => request<User>(`/api/users/${id}`),
  create: (payload: { name: string; email?: string; age?: number; condition_notes?: string }) =>
    request<User>("/api/users", { method: "POST", body: JSON.stringify(payload) }),
}

// ─── Exercises ────────────────────────────────────────────────────────────────

export const exercisesApi = {
  list: async (params?: { body_part?: string; difficulty?: string }) => {
    const qs = new URLSearchParams()
    if (params?.body_part) qs.set("body_part", params.body_part)
    if (params?.difficulty) qs.set("difficulty", params.difficulty)
    const query = qs.toString() ? `?${qs}` : ""
    const data = await requestWithFallback<Exercise[]>(
      `/api/exercises${query}`,
      DEFAULT_EXERCISES,
      "Exercises API"
    )

    if (data.length > 0) return data

    if (!params?.body_part && !params?.difficulty) {
      return DEFAULT_EXERCISES
    }

    return DEFAULT_EXERCISES.filter((exercise) => {
      const matchesBodyPart = params?.body_part ? exercise.body_part === params.body_part : true
      const matchesDifficulty = params?.difficulty ? exercise.difficulty === params.difficulty : true
      return matchesBodyPart && matchesDifficulty
    })
  },
  get: (id: string) => request<Exercise>(`/api/exercises/${id}`),
}

// ─── Exercise Sessions ────────────────────────────────────────────────────────

export const sessionsApi = {
  create: (payload: CreateSessionPayload) =>
    request<SessionCreateResponse>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  list: (user_id: string, limit = 20, offset = 0) =>
    requestWithFallback<SessionListResponse>(
      `/api/sessions?user_id=${user_id}&limit=${limit}&offset=${offset}`,
      { sessions: [], total: 0 },
      "Sessions API"
    ),
}

// ─── Game Sessions ────────────────────────────────────────────────────────────

export const gameSessionsApi = {
  create: (payload: CreateGameSessionPayload) =>
    request<GameSessionCreateResponse>("/api/game-sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  list: (user_id: string, game_type?: string, limit = 20) => {
    const qs = new URLSearchParams({ user_id })
    if (game_type) qs.set("game_type", game_type)
    qs.set("limit", String(limit))
    return requestWithFallback<GameSessionListResponse>(
      `/api/game-sessions?${qs}`,
      { sessions: [], total: 0 },
      "Game sessions API"
    )
  },
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export const feedbackApi = {
  /** Returns FeedbackResponse (200) or FeedbackProcessing (202). */
  get: async (
    session_id: string,
    session_type: "exercise" | "game" | "cognitive_test"
  ): Promise<FeedbackResponse | FeedbackProcessing> => {
    const res = await fetch(
      `${BASE}/api/feedback/${session_id}?session_type=${session_type}`,
      { headers: { "Content-Type": "application/json" } }
    )
    if (res.status === 202) return res.json() as Promise<FeedbackProcessing>
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail ?? `Feedback request failed: ${res.status}`)
    }
    return res.json() as Promise<FeedbackResponse>
  },
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export const progressApi = {
  get: (user_id: string) =>
    requestWithFallback<ProgressResponse>(
      `/api/progress/${user_id}`,
      {
        user_id,
        summary: {
          total_exercise_sessions: 0,
          total_game_sessions: 0,
          total_reps: 0,
          avg_form_score: undefined,
          current_streak_days: 0,
          total_active_days: 0,
        },
        exercise_progress: [],
        game_progress: [],
        recent_feedback: [],
        body_part_breakdown: [],
      },
      "Progress API"
    ),
  trend: (user_id: string, days = 30, exercise_id?: string) => {
    const qs = new URLSearchParams({ days: String(days) })
    if (exercise_id) qs.set("exercise_id", exercise_id)
    return requestWithFallback<ExerciseTrendResponse>(
      `/api/progress/${user_id}/exercise-trend?${qs}`,
      { trend: [] },
      "Exercise trend API"
    )
  },
}

// ─── Cognitive Tests ──────────────────────────────────────────────────────────

export interface CognitiveTestSession {
  id: string
  user_id: string
  test_type: string
  score: number
  response_time_ms?: number
  accuracy?: number
  transcript?: string
  expected_response?: string
  word_count?: number
  error_count?: number
  duration_seconds?: number
  test_metadata?: Record<string, unknown>
  completed_at: string
}

export interface CreateCognitiveTestPayload {
  user_id: string
  test_type: "memory_recall" | "verbal_fluency" | "attention_reaction" | "sentence_repetition"
  score: number
  response_time_ms?: number
  accuracy?: number
  transcript?: string
  expected_response?: string
  word_count?: number
  error_count?: number
  duration_seconds?: number
  test_metadata?: Record<string, unknown>
}

export interface CognitiveTestCreateResponse {
  id: string
  user_id: string
  test_type: string
  score: number
  accuracy?: number
  response_time_ms?: number
  duration_seconds?: number
  completed_at: string
  feedback_id: string
}

export interface CognitiveTestListItem {
  id: string
  test_type: string
  score: number
  accuracy?: number
  response_time_ms?: number
  duration_seconds?: number
  completed_at: string
}

export interface CognitiveTestListResponse {
  sessions: CognitiveTestListItem[]
  total: number
}

export interface EvaluateResponsePayload {
  test_type: string
  transcript: string
  expected_response: string
  test_metadata?: Record<string, unknown>
}

export interface EvaluateResponseResult {
  score: number
  accuracy: number
  feedback: string
  corrections: string[]
  missed_items: string[]
  extra_items: string[]
}

export const cognitiveTestsApi = {
  create: (payload: CreateCognitiveTestPayload) =>
    request<CognitiveTestCreateResponse>("/api/cognitive-tests", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  list: (user_id: string, test_type?: string, limit = 20) => {
    const qs = new URLSearchParams({ user_id })
    if (test_type) qs.set("test_type", test_type)
    qs.set("limit", String(limit))
    return requestWithFallback<CognitiveTestListResponse>(
      `/api/cognitive-tests?${qs}`,
      { sessions: [], total: 0 },
      "Cognitive tests API"
    )
  },
  evaluate: (payload: EvaluateResponsePayload) =>
    request<EvaluateResponseResult>("/api/cognitive-tests/evaluate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
}

