-- Add is_public column to profiles table
-- When true, user's current lyric is visible on Explore and their @username page
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN profiles.is_public IS 'When true, current lyric is visible on Explore and public profile';
