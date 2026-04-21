-- ============================================================
-- 002_draft_sessions.sql — Add session-based draft tracking
--
-- Adds a session_token column to intake_submissions so anonymous
-- users can resume their intake form from where they left off.
-- Also stores the current step and visited steps for navigation.
-- ============================================================

-- Add session tracking columns to intake_submissions
ALTER TABLE intake_submissions
  ADD COLUMN session_token TEXT,
  ADD COLUMN current_step  TEXT DEFAULT 'get-started',
  ADD COLUMN visited_steps TEXT[] DEFAULT ARRAY['get-started']::TEXT[];

-- Index for fast lookups by session token
CREATE INDEX idx_intake_session_token ON intake_submissions(session_token)
  WHERE session_token IS NOT NULL AND status = 'draft';
