-- Migration: Notify parent comment authors when someone replies to their comment
-- Adds 'reply' notification type and updates the comment trigger.

-- ========================================
-- 1. Expand CHECK constraint to allow 'reply'
-- ========================================
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Find and drop any check constraint on the type column
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
  CHECK (type IN ('reaction', 'comment', 'reply', 'new_lyric', 'collection_add'));

-- ========================================
-- 2. Replace notify_on_comment to also notify parent comment author
-- ========================================
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lyric RECORD;
  v_actor_username TEXT;
  v_parent_comment RECORD;
BEGIN
  -- Get lyric details
  SELECT id, user_id, content, song_title, artist_name, share_token
    INTO v_lyric
    FROM lyrics WHERE id = NEW.lyric_id;

  -- Get actor username
  SELECT username INTO v_actor_username FROM profiles WHERE id = NEW.user_id;

  -- Notify lyric owner (skip self-comments)
  IF v_lyric.user_id != NEW.user_id THEN
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
  END IF;

  -- Notify parent comment author on replies
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT id, user_id INTO v_parent_comment
      FROM comments WHERE id = NEW.parent_comment_id;

    -- Skip if replying to yourself, or if parent author is the lyric owner (already notified above)
    IF v_parent_comment.user_id IS NOT NULL
       AND v_parent_comment.user_id != NEW.user_id
       AND v_parent_comment.user_id != v_lyric.user_id
    THEN
      INSERT INTO notifications (user_id, type, lyric_id, comment_id, actor_id, lyric_snippet, song_title, artist_name, share_token, actor_username, comment_content)
      VALUES (
        v_parent_comment.user_id,
        'reply',
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
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
