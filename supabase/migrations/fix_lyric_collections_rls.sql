-- Fix lyric_collections RLS: allow users to save ANY lyric to THEIR OWN collections
-- Previous policies incorrectly checked lyrics.user_id (lyric ownership) instead of
-- collections.user_id (collection ownership), preventing saves of other users' lyrics.

-- Drop the broken policies
DROP POLICY IF EXISTS "Users can view their own lyric collections" ON lyric_collections;
DROP POLICY IF EXISTS "Users can manage their own lyric collections" ON lyric_collections;

-- Recreate with correct ownership check (collection owner, not lyric owner)
CREATE POLICY "Users can view their own lyric collections"
  ON lyric_collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = lyric_collections.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own lyric collections"
  ON lyric_collections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = lyric_collections.collection_id
      AND collections.user_id = auth.uid()
    )
  );
