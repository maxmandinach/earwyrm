-- Add is_saved column to lyrics table
-- Saved lyrics (is_saved = true) only appear in collections, not memory lane
-- Normal earwyrms (is_saved = false, default) appear in memory lane as usual
ALTER TABLE lyrics ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT FALSE;
