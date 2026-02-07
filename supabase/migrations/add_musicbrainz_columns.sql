-- Add MusicBrainz metadata columns to lyrics table
-- These store verified song/artist data and cover art

ALTER TABLE lyrics
ADD COLUMN IF NOT EXISTS album_name TEXT,
ADD COLUMN IF NOT EXISTS cover_art_url TEXT,
ADD COLUMN IF NOT EXISTS musicbrainz_recording_id TEXT,
ADD COLUMN IF NOT EXISTS musicbrainz_release_id TEXT;

-- Index for potential lookups by MusicBrainz ID
CREATE INDEX IF NOT EXISTS idx_lyrics_musicbrainz_recording
ON lyrics(musicbrainz_recording_id)
WHERE musicbrainz_recording_id IS NOT NULL;

COMMENT ON COLUMN lyrics.album_name IS 'Album name from MusicBrainz';
COMMENT ON COLUMN lyrics.cover_art_url IS 'Cover art URL from Cover Art Archive';
COMMENT ON COLUMN lyrics.musicbrainz_recording_id IS 'MusicBrainz recording MBID';
COMMENT ON COLUMN lyrics.musicbrainz_release_id IS 'MusicBrainz release MBID';
