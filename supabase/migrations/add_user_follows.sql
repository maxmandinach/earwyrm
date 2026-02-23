-- Migration: User-to-user follows + share notifications
-- Created: 2026-02-22
-- Description: user_follows table, follow notification trigger, share notification policy

-- ========================================
-- 1. user_follows table
-- ========================================
CREATE TABLE user_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CHECK (follower_id != following_id),
  UNIQUE (follower_id, following_id)
);

CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);

-- ========================================
-- 2. RLS policies
-- ========================================
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user follows"
  ON user_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow as themselves"
  ON user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow as themselves"
  ON user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ========================================
-- 3. Expand notification type CHECK to include 'follow' and 'share'
-- ========================================
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

DO $$
BEGIN
  EXECUTE (
    SELECT 'ALTER TABLE notifications DROP CONSTRAINT ' || quote_ident(conname)
    FROM pg_constraint
    WHERE conrelid = 'notifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%type%'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('reaction', 'comment', 'reply', 'new_lyric', 'collection_add', 'follow', 'share'));

-- ========================================
-- 4. Follow notification trigger
-- ========================================
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_follower_username TEXT;
BEGIN
  -- Get follower username
  SELECT username INTO v_follower_username FROM profiles WHERE id = NEW.follower_id;

  -- Insert notification for the followed user
  INSERT INTO notifications (user_id, type, actor_id, actor_username)
  VALUES (
    NEW.following_id,
    'follow',
    NEW.follower_id,
    v_follower_username
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_follow ON user_follows;
CREATE TRIGGER trg_notify_follow
  AFTER INSERT ON user_follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

-- ========================================
-- 5. Share notification INSERT policy (app-side inserts)
-- ========================================
CREATE POLICY "Users can insert share notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = actor_id AND type = 'share');
