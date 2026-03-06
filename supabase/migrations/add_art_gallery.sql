-- Add image_url to card_art_generations so each generation tracks its own URL
ALTER TABLE card_art_generations ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Backfill: for existing single-art lyrics, populate image_url from lyrics.card_art_url
UPDATE card_art_generations g
SET image_url = l.card_art_url
FROM lyrics l
WHERE g.lyric_id = l.id
  AND l.card_art_url IS NOT NULL
  AND g.image_url IS NULL;

-- Service role needs to update generation records with image_url after upload
CREATE POLICY "Service role can update generations"
    ON card_art_generations FOR UPDATE
    USING (true)
    WITH CHECK (true);
