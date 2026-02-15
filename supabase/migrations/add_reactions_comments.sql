-- Reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lyric_id uuid REFERENCES lyrics(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(lyric_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_lyric ON reactions(lyric_id);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lyric_id uuid REFERENCES lyrics(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL CHECK (char_length(content) <= 280),
  parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_lyric ON comments(lyric_id);

-- Trigger: maintain lyrics.reaction_count
CREATE OR REPLACE FUNCTION update_reaction_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lyrics SET reaction_count = reaction_count + 1 WHERE id = NEW.lyric_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lyrics SET reaction_count = reaction_count - 1 WHERE id = OLD.lyric_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reaction_count ON reactions;
CREATE TRIGGER trg_reaction_count
  AFTER INSERT OR DELETE ON reactions
  FOR EACH ROW EXECUTE FUNCTION update_reaction_count();

-- Trigger: maintain lyrics.comment_count
CREATE OR REPLACE FUNCTION update_comment_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lyrics SET comment_count = comment_count + 1 WHERE id = NEW.lyric_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lyrics SET comment_count = comment_count - 1 WHERE id = OLD.lyric_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comment_count ON comments;
CREATE TRIGGER trg_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- RLS for reactions
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reactions"
  ON reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert own reactions"
  ON reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON reactions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments on public lyrics"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert own comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);
