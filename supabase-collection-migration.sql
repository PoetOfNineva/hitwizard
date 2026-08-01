-- HitWizard — Multi-Song Smart Link Collection Support
-- Run this in Supabase SQL Editor

-- Add collection columns to existing smart_links table
ALTER TABLE smart_links 
  ADD COLUMN IF NOT EXISTS link_type TEXT DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS collection_title TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS collection_description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS songs JSONB DEFAULT '[]';

-- link_type: 'single' = one song (existing behaviour)
--            'collection' = multiple songs (EP, playlist, recommendations)

-- songs JSONB structure for collections:
-- [
--   {
--     "title": "Heaven In Your Eyes",
--     "artist": "Celine Enya Houston",
--     "artwork_url": "https://...",
--     "platforms": {
--       "spotify": "https://open.spotify.com/track/...",
--       "apple": "https://music.apple.com/...",
--       "youtube": "https://youtube.com/..."
--     }
--   }
-- ]

-- Index for fast slug lookups (may already exist)
CREATE INDEX IF NOT EXISTS smart_links_slug_idx ON smart_links(slug);
CREATE INDEX IF NOT EXISTS smart_links_type_idx ON smart_links(link_type);
