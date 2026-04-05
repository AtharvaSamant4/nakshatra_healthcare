-- Persist client progressive ROM score / quality for session-to-session tracking.
-- Run in Supabase SQL editor (or psql) after backup.
-- Safe to run multiple times.

ALTER TABLE public.exercise_sessions
  ADD COLUMN IF NOT EXISTS progressive_score integer NULL;

ALTER TABLE public.exercise_sessions
  ADD COLUMN IF NOT EXISTS progressive_quality text NULL;

COMMENT ON COLUMN public.exercise_sessions.progressive_score IS '0–100 progressive ROM score from client (parallel to form_score).';
COMMENT ON COLUMN public.exercise_sessions.progressive_quality IS 'Quality label: perfect | good | improving | poor';
