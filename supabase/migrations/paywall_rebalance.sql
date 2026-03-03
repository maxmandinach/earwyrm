-- Add card art URL to lyrics (persistent asset)
ALTER TABLE lyrics ADD COLUMN IF NOT EXISTS card_art_url TEXT;

-- Rate limiting table for AI art generations
CREATE TABLE IF NOT EXISTS card_art_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    lyric_id UUID REFERENCES lyrics(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_art_gen_user_date
    ON card_art_generations(user_id, created_at);

-- RLS
ALTER TABLE card_art_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generations"
    ON card_art_generations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations"
    ON card_art_generations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own card art from storage
-- (path pattern: card-art/{lyric_id}.webp)
CREATE POLICY "Users can delete own card-art"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'card-art'
        AND auth.role() = 'authenticated'
    );
