-- Fix: Allow viewing ALL public lyrics, not just is_current ones.
-- The original policy restricted public visibility to is_current = true,
-- which meant lyrics didn't show on song/artist pages even when public.

DROP POLICY IF EXISTS "Anyone can view public current lyrics" ON lyrics;

CREATE POLICY "Anyone can view public lyrics"
  ON lyrics FOR SELECT
  USING (is_public = true);
