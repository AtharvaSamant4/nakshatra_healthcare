# Agent Handoff Context: Exercise + Voice Cognitive Features

## 1) Mission and Scope
- Primary goal: deliver and stabilize Exercise Tracking plus Voice-Based Cognitive Testing in this repo.
- Current scope for portability: copy these features into another diverged repository without bringing unrelated changes.

## 2) Repository Context
- Backend stack: FastAPI + Supabase + Gemini.
- Frontend stack: Next.js App Router + React client components.
- Realtime browser features:
  - Speech-to-text / text-to-speech via Web Speech API.
  - Pose tracking via MediaPipe loaded from CDN.

## 3) What Is Implemented and Working

### 3.1 Cognitive backend
- API router exists and is mounted via main backend app.
- Session create/list/evaluate flows are implemented.
- Pydantic models for create/list/evaluate requests/responses are in place.
- Gemini-driven feedback and response evaluation are wired.

Relevant files:
- [backend/app/routers/cognitive_tests.py](backend/app/routers/cognitive_tests.py)
- [backend/app/services/cognitive_test_service.py](backend/app/services/cognitive_test_service.py)
- [backend/app/models/cognitive_test_models.py](backend/app/models/cognitive_test_models.py)
- [backend/app/services/gemini_service.py](backend/app/services/gemini_service.py)

### 3.2 Cognitive frontend
- Dedicated cognitive tests page with tabs and summary cards.
- Four test components implemented:
  - Memory Recall
  - Verbal Fluency
  - Attention and Reaction
  - Sentence Repetition
- API save flow into backend cognitive endpoints is connected.

Relevant files:
- [frontend/app/cognitive-tests/page.tsx](frontend/app/cognitive-tests/page.tsx)
- [frontend/components/cognitive-tests/memory-recall-test.tsx](frontend/components/cognitive-tests/memory-recall-test.tsx)
- [frontend/components/cognitive-tests/verbal-fluency-test.tsx](frontend/components/cognitive-tests/verbal-fluency-test.tsx)
- [frontend/components/cognitive-tests/attention-reaction-test.tsx](frontend/components/cognitive-tests/attention-reaction-test.tsx)
- [frontend/components/cognitive-tests/sentence-repetition-test.tsx](frontend/components/cognitive-tests/sentence-repetition-test.tsx)
- [frontend/lib/speech.ts](frontend/lib/speech.ts)
- [frontend/lib/api.ts](frontend/lib/api.ts)

### 3.3 Exercise frontend
- Exercise page supports exercise selection, session control, and session summary.
- Webcam + pose estimation + rep counting flow is integrated.
- Custom angle-config aware rep counter is implemented and used.

Relevant files:
- [frontend/app/exercise/page.tsx](frontend/app/exercise/page.tsx)
- [frontend/components/exercise/webcam-feed.tsx](frontend/components/exercise/webcam-feed.tsx)
- [frontend/hooks/use-shoulder-flexion-counter.ts](frontend/hooks/use-shoulder-flexion-counter.ts)

### 3.4 Database
- Cognitive session table exists with indexes and patient foreign key.

Relevant file:
- [schema.sql](schema.sql)

## 4) Important Runtime Fixes Already Applied
- Attention and Reaction test had listening/finalization issues and initialization-order runtime errors.
- Current behavior in Attention and Reaction:
  - User speaks answer.
  - User explicitly presses Save Answer.
  - Recognition is stopped and answer is processed.
- Initialization errors that were fixed previously:
  - Cannot access startListening before initialization.
  - Cannot access processAnswer before initialization.

Relevant file:
- [frontend/components/cognitive-tests/attention-reaction-test.tsx](frontend/components/cognitive-tests/attention-reaction-test.tsx)

## 5) AI Prompt Assets to Reuse

### 5.1 Exercise feedback prompt source
- Implemented in Gemini service function that generates structured recovery feedback from session metrics and history.

Source file:
- [backend/app/services/gemini_service.py](backend/app/services/gemini_service.py)

### 5.2 Cognitive response evaluation prompt source
- Implemented in Gemini service function that evaluates transcript vs expected response by test type.

Source file:
- [backend/app/services/gemini_service.py](backend/app/services/gemini_service.py)

## 6) API Contract Surface to Preserve

### 6.1 Cognitive endpoints
- POST /api/cognitive-tests
- GET /api/cognitive-tests
- POST /api/cognitive-tests/evaluate

Router source:
- [backend/app/routers/cognitive_tests.py](backend/app/routers/cognitive_tests.py)

### 6.2 Frontend cognitive client
- create
- list
- evaluate

Client source:
- [frontend/lib/api.ts](frontend/lib/api.ts)

## 7) Porting Checklist for Another Repo
1. Add schema for cognitive sessions from [schema.sql](schema.sql).
2. Copy cognitive backend model, service, router files listed above.
3. Ensure router is included from backend main app.
4. Copy frontend speech utility from [frontend/lib/speech.ts](frontend/lib/speech.ts).
5. Copy cognitive page and all four cognitive test components.
6. Copy cognitive API types/client section from [frontend/lib/api.ts](frontend/lib/api.ts).
7. Copy exercise page, webcam component, and counter hook.
8. Verify environment variable and Gemini setup in target backend settings.

## 8) Validation Status in This Repo
- Frontend build checks passed after cognitive attention flow fixes.
- Backend syntax checks were previously verified.
- Remaining risk area when porting: browser/device-specific behavior for SpeechRecognition and camera permissions.

## 9) Known Integration Dependencies
- Browser support required for SpeechRecognition and SpeechSynthesis.
- Network availability required to load MediaPipe CDN scripts in exercise webcam flow.
- Gemini API key and backend settings must be present in target environment.
- Supabase tables and foreign keys must match expected schema.

## 10) Suggested Next Actions for Receiving Agent
1. Recreate schema and backend endpoints first.
2. Port frontend API client contracts and verify endpoint connectivity.
3. Port speech utilities and cognitive test components.
4. Port exercise webcam + counter pipeline.
5. Run end-to-end smoke tests:
   - Start/stop exercise session and save results.
   - Run each cognitive test and verify save.
   - Validate Attention and Reaction Save Answer behavior.
6. Confirm Gemini feedback and evaluation responses are parsed correctly.

## 11) Optional Narrow-Merge Guidance
- If only Exercise + Voice Tests should move:
  - Stage only files listed in this document.
  - Exclude unrelated dashboard, styling, or infrastructure edits.
  - Validate target branch with focused smoke tests before merge.
