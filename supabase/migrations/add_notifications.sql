-- Migration: Add notification system + public collections
-- Created: 2026-02-16
-- Description: Notifications table with triggers, unread tracking, public collections, collection follows

-- ========================================
-- 1. Notifications table
-- ========================================
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('reaction', 'comment', 'new_lyric', 'collection_add')),
  lyric_id UUID REFERENCES lyrics(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Denormalized display data (avoids joins when rendering)
  lyric_snippet TEXT,
  song_title TEXT,
  artist_name TEXT,
  share_token TEXT,
  actor_username TEXT,
  comment_content TEXT,
  collection_name TEXT,
  follow_type TEXT,   -- 'tag', 'artist', 'song' (for new_lyric type)
  follow_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- ========================================
-- 2. Unread tracking on profiles
-- ========================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_seen_at TIMESTAMPTZ DEFAULT NOW();

-- ========================================
-- 3. Public collections + collection follows
-- ========================================
ALTER TABLE collections ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Expand follows CHECK constraint to allow 'collection'
ALTER TABLE follows DROP CONSTRAINT IF EXISTS follows_filter_type_check;
-- Also try the inline check constraint name pattern
DO $$
BEGIN
  -- Try dropping any check constraint on filter_type
  EXECUTE (
    SELECT 'ALTER TABLE follows DROP CONSTRAINT ' || quote_ident(conname)
    FROM pg_constraint
    WHERE conrelid = 'follows'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%filter_type%'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  NULL; -- constraint already dropped above or doesn't exist
END $$;

ALTER TABLE follows ADD CONSTRAINT follows_filter_type_check
  CHECK (filter_type IN ('tag', 'artist', 'song', 'collection'));

-- ========================================
-- 4. RLS policies
-- ========================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Public collections: anyone can view public collections
CREATE POLICY "Anyone can view public collections"
  ON collections FOR SELECT
  USING (is_public = true);

-- Public collection lyrics: anyone can view lyrics in public collections
CREATE POLICY "Anyone can view lyrics in public collections"
  ON lyric_collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = lyric_collections.collection_id
      AND collections.is_public = true
    )
  );

-- ========================================
-- 5. Trigger: notify on reaction
-- ========================================
CREATE OR REPLACE FUNCTION notify_on_reaction()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lyric RECORD;
  v_actor_username TEXT;
BEGIN
  -- Get lyric details
  SELECT id, user_id, content, song_title, artist_name, share_token
    INTO v_lyric
    FROM lyrics WHERE id = NEW.lyric_id;

  -- Skip self-reactions
  IF v_lyric.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get actor username
  SELECT username INTO v_actor_username FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, lyric_id, actor_id, lyric_snippet, song_title, artist_name, share_token, actor_username)
  VALUES (
    v_lyric.user_id,
    'reaction',
    v_lyric.id,
    NEW.user_id,
    LEFT(v_lyric.content, 80),
    v_lyric.song_title,
    v_lyric.artist_name,
    v_lyric.share_token,
    v_actor_username
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_reaction ON reactions;
CREATE TRIGGER trg_notify_reaction
  AFTER INSERT ON reactions
  FOR EACH ROW EXECUTE FUNCTION notify_on_reaction();

-- ========================================
-- 6. Trigger: notify on comment
-- ========================================
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lyric RECORD;
  v_actor_username TEXT;
BEGIN
  -- Get lyric details
  SELECT id, user_id, content, song_title, artist_name, share_token
    INTO v_lyric
    FROM lyrics WHERE id = NEW.lyric_id;

  -- Skip self-comments
  IF v_lyric.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get actor username
  SELECT username INTO v_actor_username FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, lyric_id, comment_id, actor_id, lyric_snippet, song_title, artist_name, share_token, actor_username, comment_content)
  VALUES (
    v_lyric.user_id,
    'comment',
    v_lyric.id,
    NEW.id,
    NEW.user_id,
    LEFT(v_lyric.content, 80),
    v_lyric.song_title,
    v_lyric.artist_name,
    v_lyric.share_token,
    v_actor_username,
    LEFT(NEW.content, 140)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_comment ON comments;
CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- ========================================
-- 7. Trigger: notify followers on new public lyric
-- ========================================
CREATE OR REPLACE FUNCTION notify_followers_on_lyric()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_username TEXT;
  v_follower RECORD;
  v_notified_users UUID[] := '{}';
BEGIN
  -- Only notify for public lyrics
  IF NOT NEW.is_public THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, only notify if is_public just changed from false to true
  IF TG_OP = 'UPDATE' AND OLD.is_public = true THEN
    RETURN NEW;
  END IF;

  -- Get author username
  SELECT username INTO v_author_username FROM profiles WHERE id = NEW.user_id;

  -- Notify artist followers
  IF NEW.artist_name IS NOT NULL THEN
    FOR v_follower IN
      SELECT user_id FROM follows
      WHERE filter_type = 'artist'
        AND LOWER(filter_value) = LOWER(NEW.artist_name)
        AND user_id != NEW.user_id
    LOOP
      IF NOT (v_follower.user_id = ANY(v_notified_users)) THEN
        INSERT INTO notifications (user_id, type, lyric_id, actor_id, lyric_snippet, song_title, artist_name, share_token, actor_username, follow_type, follow_value)
        VALUES (
          v_follower.user_id, 'new_lyric', NEW.id, NEW.user_id,
          LEFT(NEW.content, 80), NEW.song_title, NEW.artist_name, NEW.share_token,
          v_author_username, 'artist', NEW.artist_name
        );
        v_notified_users := array_append(v_notified_users, v_follower.user_id);
      END IF;
    END LOOP;
  END IF;

  -- Notify song followers
  IF NEW.song_title IS NOT NULL THEN
    FOR v_follower IN
      SELECT user_id FROM follows
      WHERE filter_type = 'song'
        AND LOWER(filter_value) = LOWER(NEW.song_title)
        AND user_id != NEW.user_id
    LOOP
      IF NOT (v_follower.user_id = ANY(v_notified_users)) THEN
        INSERT INTO notifications (user_id, type, lyric_id, actor_id, lyric_snippet, song_title, artist_name, share_token, actor_username, follow_type, follow_value)
        VALUES (
          v_follower.user_id, 'new_lyric', NEW.id, NEW.user_id,
          LEFT(NEW.content, 80), NEW.song_title, NEW.artist_name, NEW.share_token,
          v_author_username, 'song', NEW.song_title
        );
        v_notified_users := array_append(v_notified_users, v_follower.user_id);
      END IF;
    END LOOP;
  END IF;

  -- Notify tag followers
  IF NEW.tags IS NOT NULL AND array_length(NEW.tags, 1) > 0 THEN
    FOR v_follower IN
      SELECT DISTINCT f.user_id FROM follows f
      WHERE f.filter_type = 'tag'
        AND LOWER(f.filter_value) = ANY(
          SELECT LOWER(unnest(NEW.tags))
        )
        AND f.user_id != NEW.user_id
    LOOP
      IF NOT (v_follower.user_id = ANY(v_notified_users)) THEN
        -- Pick the first matching tag as the follow_value
        INSERT INTO notifications (user_id, type, lyric_id, actor_id, lyric_snippet, song_title, artist_name, share_token, actor_username, follow_type, follow_value)
        VALUES (
          v_follower.user_id, 'new_lyric', NEW.id, NEW.user_id,
          LEFT(NEW.content, 80), NEW.song_title, NEW.artist_name, NEW.share_token,
          v_author_username, 'tag',
          (SELECT f2.filter_value FROM follows f2
           WHERE f2.user_id = v_follower.user_id
             AND f2.filter_type = 'tag'
             AND LOWER(f2.filter_value) = ANY(SELECT LOWER(unnest(NEW.tags)))
           LIMIT 1)
        );
        v_notified_users := array_append(v_notified_users, v_follower.user_id);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_followers_lyric ON lyrics;
CREATE TRIGGER trg_notify_followers_lyric
  AFTER INSERT OR UPDATE OF is_public ON lyrics
  FOR EACH ROW EXECUTE FUNCTION notify_followers_on_lyric();

-- ========================================
-- 8. Trigger: notify collection followers on lyric added
-- ========================================
CREATE OR REPLACE FUNCTION notify_collection_add()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collection RECORD;
  v_lyric RECORD;
  v_owner_username TEXT;
  v_follower RECORD;
BEGIN
  -- Get collection details
  SELECT id, user_id, name, is_public
    INTO v_collection
    FROM collections WHERE id = NEW.collection_id;

  -- Only notify for public collections
  IF NOT v_collection.is_public THEN
    RETURN NEW;
  END IF;

  -- Get lyric details
  SELECT id, content, song_title, artist_name, share_token
    INTO v_lyric
    FROM lyrics WHERE id = NEW.lyric_id;

  -- Get collection owner username
  SELECT username INTO v_owner_username FROM profiles WHERE id = v_collection.user_id;

  -- Notify all followers of this collection
  FOR v_follower IN
    SELECT user_id FROM follows
    WHERE filter_type = 'collection'
      AND filter_value = v_collection.id::text
      AND user_id != v_collection.user_id
  LOOP
    INSERT INTO notifications (user_id, type, lyric_id, collection_id, actor_id, lyric_snippet, song_title, artist_name, share_token, actor_username, collection_name)
    VALUES (
      v_follower.user_id,
      'collection_add',
      v_lyric.id,
      v_collection.id,
      v_collection.user_id,
      LEFT(v_lyric.content, 80),
      v_lyric.song_title,
      v_lyric.artist_name,
      v_lyric.share_token,
      v_owner_username,
      v_collection.name
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_collection_add ON lyric_collections;
CREATE TRIGGER trg_notify_collection_add
  AFTER INSERT ON lyric_collections
  FOR EACH ROW EXECUTE FUNCTION notify_collection_add();

-- ========================================
-- 9. Enable Realtime for notifications
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
