-- ============================================================
-- HitWizard — Reel History Vault Migration
-- Run in Supabase SQL Editor: supabase.com/dashboard/project/vklwiqbglmhyjuenysal
-- ============================================================

-- Create reel_history table
CREATE TABLE IF NOT EXISTS reel_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_title TEXT NOT NULL DEFAULT '',
  artist TEXT NOT NULL DEFAULT '',
  vibe TEXT NOT NULL DEFAULT '',
  video_type TEXT NOT NULL DEFAULT '',
  clip_count INTEGER NOT NULL DEFAULT 0,
  scenes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: each user sees only their own reel history
ALTER TABLE reel_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reel_history_select_own"
  ON reel_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "reel_history_insert_own"
  ON reel_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reel_history_delete_own"
  ON reel_history FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups by user + song title
CREATE INDEX IF NOT EXISTS reel_history_user_song_idx
  ON reel_history(user_id, song_title);

CREATE INDEX IF NOT EXISTS reel_history_user_created_idx
  ON reel_history(user_id, created_at DESC);

-- ============================================================
-- scenes JSONB structure (one entry per generation):
-- [
--   {
--     "clipIndex": 1,
--     "timestamp": "0:00-0:15",
--     "type": "A-ROLL",
--     "grokPrompt": "...",
--     "shotType": "Close-up",
--     "animationNotes": "..."
--   },
--   ...
-- ]
-- ============================================================
