# Architectural Decisions

> Key decisions made during architecture planning and their rationale.
> These are final for V1. Do not revisit unless the team explicitly agrees.

---

## 1. MediaPipe Runs in the Browser (Not Backend)

**Decision:** All pose tracking happens client-side using `@mediapipe/tasks-vision`.

**Why:**
- Exercise tracking needs real-time feedback at **60fps** — any network round-trip would destroy the experience
- No video ever leaves the device → **privacy by design**
- No need for a GPU server → **zero infrastructure cost**
- Works offline once the model is cached in the browser

**Trade-off:** Model loading takes 3–8 seconds on first load. Mitigated with a loading screen and pre-loading on the exercise library page.

---

## 2. Exercise Logic is Client-Side

**Decision:** Angle calculation, rep counting, and form scoring all run in `lib/exerciseEngine.ts` on the frontend.

**Why:**
- These computations depend on MediaPipe landmarks which are already in the browser
- Sending landmarks to the backend for processing would add latency and defeat real-time feedback
- The math is simple (angle between 3 points, threshold comparison) — no need for server compute

**What the backend receives:** Only the **session summary** (total reps, avg angle, form score, duration) — never raw landmarks.

---

## 3. No Authentication for V1

**Decision:** No OAuth, no JWT, no login screen. Users are selected via a dropdown.

**Why:**
- Saves **2+ hours** of development time (OAuth flows, token management, protected routes)
- This is a **demo/hackathon** product — not a production system
- User context is maintained via React Context with a `selectedUserId`
- All API calls include `user_id` in the request body or URL params

**How it works:**
- Navbar has a user-select dropdown populated from `GET /api/users`
- Selected user ID is stored in `UserContext`
- All API requests include this user ID

---

## 4. REST over WebSocket

**Decision:** All frontend ↔ backend communication uses standard REST (HTTP).

**Why:**
- We send **session summaries**, not frame-by-frame data — no streaming needed
- REST is simpler to implement, test, and debug
- No persistent connection management required
- The data flow is request/response, not bidirectional streaming

**When WebSocket would be needed:** If we were sending raw MediaPipe landmarks to the backend in real-time (which we are not).

---

## 5. Gemini Feedback is Async

**Decision:** When a session is POSTed, the backend starts Gemini generation but returns a `feedback_id` immediately. Frontend polls for the result.

**Why:**
- Gemini API calls take 2–5 seconds — blocking the POST response would feel slow
- The user sees their session results immediately while feedback generates in the background
- If Gemini fails or is slow, the session data is already saved
- Frontend shows a `FeedbackLoader` component with a retry mechanism

**Flow:**
1. `POST /api/sessions` → returns `201` with `feedback_id`
2. Backend triggers Gemini in the same request (sync in V1, can be made async later)
3. Frontend navigates to results page → `GET /api/feedback/{session_id}`
4. If feedback isn't ready → `202 Accepted` with retry message
5. Frontend polls every 2 seconds until `200 OK`

---

## 6. Single Supabase Database (No Caches or Queues)

**Decision:** One PostgreSQL database via Supabase for all data storage. No Redis, no message queues.

**Why:**
- Hackathon scale: ~100 sessions max during demo
- No concurrent users in practice
- Supabase free tier is more than sufficient
- Adding Redis/queues would add complexity without benefit at this scale

---

## 7. Backend is a Thin API Layer

**Decision:** FastAPI serves as a thin orchestration layer — it doesn't do heavy computation.

**Responsibilities:**
- Validate incoming data (Pydantic)
- Read/write to Supabase
- Build Gemini prompts from session data + history
- Parse Gemini responses
- Return aggregated progress data

**Not responsible for:**
- Pose tracking or angle math (frontend)
- Game logic or scoring (frontend)
- Video/image processing (none)

---

## 8. Chrome-Only Browser Support

**Decision:** Development and testing targets Chrome only.

**Why:**
- MediaPipe has best support on Chrome
- Webcam APIs are most stable on Chrome
- Limited testing time — can't QA across browsers
- A "Use Chrome for best experience" notice is added for other browsers

---

## 9. No Mobile Responsive Design

**Decision:** Desktop/laptop viewport only. No media queries for phone screens.

**Why:**
- Webcam-based exercises are intended for laptop/desktop use
- Responsive design would add significant development time
- Demo will be on a laptop screen

---

## 10. Fallback Feedback When Gemini Fails

**Decision:** If Gemini API is unavailable or errors out, the backend returns hardcoded fallback feedback.

**Why:**
- Demo cannot break due to API quota or network issues
- Fallback is generic but encouraging: "Great session! Keep up your exercises."
- Logged as a warning so we know it happened

**Implementation:** `gemini_service.py` wraps the API call in a try/except and returns a static feedback object on failure.
