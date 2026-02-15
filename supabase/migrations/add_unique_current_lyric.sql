-- Ensure at most one is_current = true lyric per user.
-- If duplicates exist, keep only the most recent one before adding the constraint.

-- First, fix any existing duplicates: keep only the newest is_current per user
WITH ranked AS (
  SELECT id, user_id, ROW_NUMBER() OVER (
    PARTITION BY user_id
    ORDER BY created_at DESC
  ) AS rn
  FROM lyrics
  WHERE is_current = true
)
UPDATE lyrics
SET is_current = false
FROM ranked
WHERE lyrics.id = ranked.id AND ranked.rn > 1;

-- Now add the partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_current_lyric_per_user
  ON lyrics (user_id)
  WHERE is_current = true;
