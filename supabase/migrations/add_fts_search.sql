-- Full-text search on lyrics
ALTER TABLE lyrics ADD COLUMN IF NOT EXISTS fts tsvector GENERATED ALWAYS AS (
  to_tsvector('english', coalesce(content,'') || ' ' || coalesce(song_title,'') || ' ' || coalesce(artist_name,''))
) STORED;

CREATE INDEX IF NOT EXISTS idx_lyrics_fts ON lyrics USING gin(fts);
