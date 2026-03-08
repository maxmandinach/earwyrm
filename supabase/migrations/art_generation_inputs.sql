-- Store the inputs used for each art generation for the record
ALTER TABLE card_art_generations
  ADD COLUMN IF NOT EXISTS note_content TEXT,
  ADD COLUMN IF NOT EXISTS art_direction TEXT;

COMMENT ON COLUMN card_art_generations.note_content IS 'Snapshot of the lyric note used for this generation';
COMMENT ON COLUMN card_art_generations.art_direction IS 'Aesthetic guidance provided for this specific generation';
