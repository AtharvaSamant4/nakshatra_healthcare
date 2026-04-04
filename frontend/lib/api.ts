// All backend API calls go through this file.
// Base URL comes from NEXT_PUBLIC_API_URL env var (default: http://localhost:8000)

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
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
  prescription_id?: string   // V2: link session to a prescription
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

// ─── V2 Types ─────────────────────────────────────────────────────────────────

export interface StaffMember {
  id: string
  name: string
  email?: string
  role: "doctor" | "receptionist"
  specialization?: string
  created_at: string
}

export interface StaffListItem {
  id: string
  name: string
  role: "doctor" | "receptionist"
  specialization?: string
}

export interface Patient {
  id: string
  name: string
  email?: string
  age?: number
  phone?: string
  condition_notes?: string
  doctor_id?: string
  status?: string
  diagnosis?: string
  injury_type?: string
  severity?: string
  emergency?: boolean
  created_at: string
}

export interface PatientListItem {
  id: string
  name: string
  status?: string
  doctor_id?: string
  injury_type?: string
  severity?: string
}

export interface PatientCreateResponse {
  id: string
  name: string
  status?: string
  doctor_id?: string
  created_at: string
}

export interface PrescriptionCompliance {
  sessions_completed: number
  last_session_at?: string
}

export interface Prescription {
  id: string
  exercise_id?: string
  exercise_name?: string
  game_type?: string
  target_reps?: number
  frequency?: string
  priority: string
  status: string
  compliance: PrescriptionCompliance
}

export interface CreatePrescriptionPayload {
  patient_id: string
  doctor_id: string
  exercise_id?: string
  game_type?: string
  target_reps?: number
  target_sets?: number
  frequency?: string
  priority?: string
  notes?: string
}

export interface UpdatePrescriptionPayload {
  status?: string
  target_reps?: number
  target_sets?: number
  frequency?: string
  priority?: string
  notes?: string
}

export interface Message {
  id: string
  sender_type: string
  sender_name?: string
  content: string
  created_at: string
}

export interface MessageThread {
  messages: Message[]
}

export interface SendMessagePayload {
  patient_id: string
  sender_type: "patient" | "doctor"
  sender_id: string
  content: string
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: () => request<UserListItem[]>("/api/users"),
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
    return request<Exercise[]>(`/api/exercises${query}`)
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
    request<SessionListResponse>(
      `/api/sessions?user_id=${user_id}&limit=${limit}&offset=${offset}`
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
    return request<GameSessionListResponse>(`/api/game-sessions?${qs}`)
  },
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export const feedbackApi = {
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
    request<ProgressResponse>(`/api/progress/${user_id}`),
  trend: (user_id: string, days = 30, exercise_id?: string) => {
    const qs = new URLSearchParams({ days: String(days) })
    if (exercise_id) qs.set("exercise_id", exercise_id)
    return request<ExerciseTrendResponse>(
      `/api/progress/${user_id}/exercise-trend?${qs}`
    )
  },
}

// ─── V2: Staff ────────────────────────────────────────────────────────────────

export const staffApi = {
  list: (role?: string) => {
    const qs = role ? `?role=${role}` : ""
    return request<StaffListItem[]>(`/api/staff${qs}`)
  },
  get: (id: string) => request<StaffMember>(`/api/staff/${id}`),
  create: (payload: { name: string; role: string; email?: string; specialization?: string }) =>
    request<StaffMember>("/api/staff", { method: "POST", body: JSON.stringify(payload) }),
}

// ─── V2: Patients ─────────────────────────────────────────────────────────────

export const patientsApi = {
  list: (params?: { doctor_id?: string; status?: string }) => {
    const qs = new URLSearchParams()
    if (params?.doctor_id) qs.set("doctor_id", params.doctor_id)
    if (params?.status) qs.set("status", params.status)
    const query = qs.toString() ? `?${qs}` : ""
    return request<PatientListItem[]>(`/api/patients${query}`)
  },
  get: (id: string) => request<Patient>(`/api/patients/${id}`),
  create: (payload: {
    name: string
    age?: number
    phone?: string
    email?: string
    doctor_id?: string
    emergency?: boolean
    condition_notes?: string
  }) =>
    request<PatientCreateResponse>("/api/patients", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<{
    diagnosis: string
    injury_type: string
    severity: string
    status: string
    condition_notes: string
    doctor_id: string
    phone: string
    emergency: boolean
  }>) =>
    request<Patient>(`/api/patients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
}

// ─── V2: Prescriptions ────────────────────────────────────────────────────────

export const prescriptionsApi = {
  list: (patient_id: string) =>
    request<Prescription[]>(`/api/prescriptions?patient_id=${patient_id}`),
  create: (payload: CreatePrescriptionPayload) =>
    request<{ id: string; patient_id: string; exercise_id?: string; status: string; created_at: string }>(
      "/api/prescriptions",
      { method: "POST", body: JSON.stringify(payload) }
    ),
  update: (id: string, payload: UpdatePrescriptionPayload) =>
    request<Record<string, unknown>>(`/api/prescriptions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
}

// ─── V2: Messages ─────────────────────────────────────────────────────────────

export const messagesApi = {
  getThread: (patient_id: string, limit = 50) =>
    request<MessageThread>(`/api/messages?patient_id=${patient_id}&limit=${limit}`),
  send: (payload: SendMessagePayload) =>
    request<Message>("/api/messages", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
}
