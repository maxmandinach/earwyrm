-- Migration: Add share_token column to lyrics table
-- Run this in Supabase SQL Editor to add shareable links feature

-- Add share_token column
ALTER TABLE lyrics ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_lyrics_share_token ON lyrics(share_token);

-- Add RLS policy to allow anyone to view lyrics by share token
CREATE POLICY "Lyrics are viewable by share token"
  ON lyrics FOR SELECT
  USING (share_token IS NOT NULL);

-- Note: Share tokens will be generated on-demand when users first share a lyric
