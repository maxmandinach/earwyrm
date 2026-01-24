-- Migration: Add follows feature
-- Created: 2026-01-24
-- Description: Allow users to follow tags, artists, and songs on Explore

-- ========================================
-- 1. Follows table
-- ========================================
CREATE TABLE IF NOT EXISTS follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  filter_type TEXT NOT NULL CHECK (filter_type IN ('tag', 'artist', 'song')),
  filter_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_follow UNIQUE(user_id, filter_type, filter_value)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_follows_user_id ON follows(user_id);

-- ========================================
-- 2. RLS Policies
-- ========================================
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follows"
  ON follows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own follows"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follows"
  ON follows FOR DELETE
  USING (auth.uid() = user_id);
