-- Content Moderation: banning, admin access, rate limiting, profanity filter

-- ============================================================
-- 1. Profile columns for banning and admin access
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- ============================================================
-- 2. Ban enforcement on INSERT policies
--    Banned users cannot create lyrics, comments, or reactions.
--    Drop existing policies and recreate with ban check.
-- ============================================================

-- Lyrics
DROP POLICY IF EXISTS "Users can insert their own lyrics" ON lyrics;
CREATE POLICY "Users can insert their own lyrics"
  ON lyrics FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND banned_at IS NOT NULL)
  );

-- Comments
DROP POLICY IF EXISTS "Authenticated users can insert own comments" ON comments;
CREATE POLICY "Authenticated users can insert own comments"
  ON comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND banned_at IS NOT NULL)
  );

-- Reactions
DROP POLICY IF EXISTS "Authenticated users can insert own reactions" ON reactions;
CREATE POLICY "Authenticated users can insert own reactions"
  ON reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND banned_at IS NOT NULL)
  );

-- ============================================================
-- 3. Admin RLS policies
-- ============================================================

-- Admins can view all reports (not just their own)
CREATE POLICY "Admins can view all reports"
  ON content_reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Admins can update report status (resolve, dismiss)
CREATE POLICY "Admins can update reports"
  ON content_reports FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Admins can view all lyrics (including hidden ones)
CREATE POLICY "Admins can view all lyrics"
  ON lyrics FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Admins can update any profile (for banning)
CREATE POLICY "Admins can update profiles for moderation"
  ON profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Admins can delete any comment (for moderation)
CREATE POLICY "Admins can delete any comment"
  ON comments FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Admins can update any lyric (for hiding)
CREATE POLICY "Admins can update any lyric"
  ON lyrics FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 4. Rate limiting via BEFORE INSERT triggers
-- ============================================================

-- Lyrics: max 1 per 30 seconds
CREATE OR REPLACE FUNCTION check_rate_limit_lyric()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM lyrics
    WHERE user_id = NEW.user_id
      AND created_at > now() - interval '30 seconds'
  ) THEN
    RAISE EXCEPTION 'Please wait a moment before posting another lyric.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rate_limit_lyric
  BEFORE INSERT ON lyrics
  FOR EACH ROW EXECUTE FUNCTION check_rate_limit_lyric();

-- Comments: max 1 per 10 seconds
CREATE OR REPLACE FUNCTION check_rate_limit_comment()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM comments
    WHERE user_id = NEW.user_id
      AND created_at > now() - interval '10 seconds'
  ) THEN
    RAISE EXCEPTION 'Please wait a moment before posting another comment.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rate_limit_comment
  BEFORE INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION check_rate_limit_comment();

-- ============================================================
-- 5. Profanity filter via blocked_words table + trigger
--    Using a table so words can be managed from the admin panel.
-- ============================================================

CREATE TABLE IF NOT EXISTS blocked_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL UNIQUE
);

ALTER TABLE blocked_words ENABLE ROW LEVEL SECURITY;

-- Only admins can manage blocked words
CREATE POLICY "Admins can manage blocked words"
  ON blocked_words FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Seed with a starter list (word-boundary matched)
INSERT INTO blocked_words (word) VALUES
  ('nigger'), ('nigga'), ('faggot'), ('fag'), ('retard'), ('retarded'),
  ('kike'), ('spic'), ('chink'), ('wetback'), ('tranny'), ('cunt')
ON CONFLICT (word) DO NOTHING;

-- Check content against blocked words (word-boundary matching)
CREATE OR REPLACE FUNCTION check_profanity()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  blocked text;
BEGIN
  SELECT word INTO blocked
  FROM blocked_words
  WHERE NEW.content ~* ('\m' || word || '\M')
  LIMIT 1;

  IF blocked IS NOT NULL THEN
    RAISE EXCEPTION 'Your post contains language that violates our community guidelines.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profanity_lyric
  BEFORE INSERT OR UPDATE ON lyrics
  FOR EACH ROW EXECUTE FUNCTION check_profanity();

CREATE TRIGGER trg_profanity_comment
  BEFORE INSERT OR UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION check_profanity();
