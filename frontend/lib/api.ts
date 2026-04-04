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
  list: (params?: { body_part?: string; difficulty?: string }) => {
    const qs = new URLSearchParams()
    if (params?.body_part) qs.set("body_part", params.body_part)
    if (params?.difficulty) qs.set("difficulty", params.difficulty)
    const query = qs.toString() ? `?${qs}` : ""
    return requestWithFallback<Exercise[]>(
      `/api/exercises${query}`,
      [],
      "Exercises API"
    )
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
    session_type: "exercise" | "game"
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
