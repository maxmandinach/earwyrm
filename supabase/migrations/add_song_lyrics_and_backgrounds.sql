-- Cached full lyrics from LRCLIB
CREATE TABLE song_lyrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  plain_lyrics TEXT,
  source TEXT DEFAULT 'lrclib',
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(song_title, artist_name)
);

ALTER TABLE song_lyrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read song_lyrics" ON song_lyrics FOR SELECT USING (true);
CREATE POLICY "Insert song_lyrics" ON song_lyrics FOR INSERT WITH CHECK (true);

-- Community wiki song backgrounds
CREATE TABLE song_backgrounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(song_title, artist_name)
);

ALTER TABLE song_backgrounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read song_backgrounds" ON song_backgrounds FOR SELECT USING (true);
CREATE POLICY "Auth insert song_backgrounds" ON song_backgrounds FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update song_backgrounds" ON song_backgrounds FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Edit history for wiki backgrounds
CREATE TABLE song_background_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  background_id UUID REFERENCES song_backgrounds(id) ON DELETE CASCADE,
  editor_id UUID REFERENCES profiles(id) NOT NULL,
  previous_content TEXT NOT NULL,
  new_content TEXT NOT NULL,
  edit_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE song_background_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read edits" ON song_background_edits FOR SELECT USING (true);
CREATE POLICY "Auth insert edits" ON song_background_edits FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
