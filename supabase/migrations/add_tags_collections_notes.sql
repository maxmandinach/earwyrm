-- Migration: Add tags, collections, and private notes features
-- Created: 2026-01-19
-- Description: Adds support for freeform tags, manual/smart collections, and private notes

-- ========================================
-- 1. Add tags to lyrics table
-- ========================================
ALTER TABLE lyrics ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- GIN index for efficient tag searches and containment queries
CREATE INDEX IF NOT EXISTS idx_lyrics_tags ON lyrics USING GIN(tags);

-- ========================================
-- 2. Collections table
-- ========================================
CREATE TABLE IF NOT EXISTS collections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'charcoal',
  is_smart BOOLEAN DEFAULT false,
  smart_tag TEXT, -- The tag to filter by if is_smart = true
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_collection_name UNIQUE(user_id, name)
);

-- Indexes for collections
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_is_smart ON collections(is_smart);

-- ========================================
-- 3. Lyric-Collections junction table
-- ========================================
CREATE TABLE IF NOT EXISTS lyric_collections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lyric_id UUID REFERENCES lyrics(id) ON DELETE CASCADE NOT NULL,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_lyric_collection UNIQUE(lyric_id, collection_id)
);

-- Indexes for junction table
CREATE INDEX IF NOT EXISTS idx_lyric_collections_lyric_id ON lyric_collections(lyric_id);
CREATE INDEX IF NOT EXISTS idx_lyric_collections_collection_id ON lyric_collections(collection_id);

-- ========================================
-- 4. Lyric notes table
-- ========================================
CREATE TABLE IF NOT EXISTS lyric_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lyric_id UUID REFERENCES lyrics(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_lyric_user_note UNIQUE(lyric_id, user_id)
);

-- Indexes for notes
CREATE INDEX IF NOT EXISTS idx_lyric_notes_lyric_id ON lyric_notes(lyric_id);
CREATE INDEX IF NOT EXISTS idx_lyric_notes_user_id ON lyric_notes(user_id);

-- ========================================
-- 5. RLS Policies for collections
-- ========================================
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own collections"
  ON collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collections"
  ON collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON collections FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 6. RLS Policies for lyric_collections
-- ========================================
ALTER TABLE lyric_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lyric collections"
  ON lyric_collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lyrics
      WHERE lyrics.id = lyric_collections.lyric_id
      AND lyrics.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own lyric collections"
  ON lyric_collections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lyrics
      WHERE lyrics.id = lyric_collections.lyric_id
      AND lyrics.user_id = auth.uid()
    )
  );

-- ========================================
-- 7. RLS Policies for lyric_notes
-- ========================================
ALTER TABLE lyric_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes"
  ON lyric_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
  ON lyric_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON lyric_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON lyric_notes FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 8. Triggers for updated_at
-- ========================================
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lyric_notes_updated_at
  BEFORE UPDATE ON lyric_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 9. Default "Favorites" collection
-- ========================================
CREATE OR REPLACE FUNCTION create_default_collections()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO collections (user_id, name, description, color)
  VALUES (NEW.id, 'Favorites', 'Your favorite lyrics', 'coral');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for migration idempotency)
DROP TRIGGER IF EXISTS create_user_defaults ON profiles;

-- Create trigger to run after profile creation
CREATE TRIGGER create_user_defaults
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_collections();
