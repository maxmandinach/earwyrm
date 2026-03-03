-- Card art: genre cache for MusicBrainz lookups
CREATE TABLE IF NOT EXISTS artist_genre_cache (
    artist_name TEXT PRIMARY KEY,
    mbid TEXT,
    tags TEXT[] DEFAULT '{}',
    fetched_at TIMESTAMPTZ DEFAULT now()
);

-- Allow Edge Functions (service role) full access, anon read for caching
ALTER TABLE artist_genre_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on artist_genre_cache"
    ON artist_genre_cache FOR ALL
    USING (true)
    WITH CHECK (true);

-- Stripe: add customer ID to profiles for web subscribers
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Card art storage bucket (created via SQL — public read, auth write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-art', 'card-art', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can read, only service role can write
CREATE POLICY "Public read card-art"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'card-art');

CREATE POLICY "Service role write card-art"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'card-art');

CREATE POLICY "Service role update card-art"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'card-art');

CREATE POLICY "Service role delete card-art"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'card-art');
