-- Canonical lyric grouping + denormalized counts
ALTER TABLE lyrics ADD COLUMN IF NOT EXISTS canonical_lyric_id uuid REFERENCES lyrics(id);
ALTER TABLE lyrics ADD COLUMN IF NOT EXISTS reaction_count integer DEFAULT 0;
ALTER TABLE lyrics ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0;

-- Onboarding timestamp
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- Note type tags
ALTER TABLE lyric_notes ADD COLUMN IF NOT EXISTS note_types text[] DEFAULT '{}';
