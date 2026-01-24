-- Migration: Add public notes feature
-- Created: 2026-01-24
-- Description: Adds ability for users to make their notes visible on Explore

-- ========================================
-- 1. Add is_public column to lyric_notes
-- ========================================
ALTER TABLE lyric_notes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Index for efficient public notes queries
CREATE INDEX IF NOT EXISTS idx_lyric_notes_is_public ON lyric_notes(is_public) WHERE is_public = true;

-- ========================================
-- 2. Update RLS Policies for lyric_notes
-- ========================================

-- Drop existing select policy
DROP POLICY IF EXISTS "Users can view their own notes" ON lyric_notes;

-- New policy: Users can view their own notes OR public notes on public lyrics
CREATE POLICY "Users can view notes"
  ON lyric_notes FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      is_public = true
      AND EXISTS (
        SELECT 1 FROM lyrics
        WHERE lyrics.id = lyric_notes.lyric_id
        AND lyrics.is_public = true
      )
    )
  );
