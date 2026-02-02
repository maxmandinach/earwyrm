-- Migration: Shorten existing share tokens from 32-char hex to 11-char base62
-- Regenerates all existing tokens. Old share links will stop working.

UPDATE lyrics
SET share_token = substr(
  replace(replace(replace(
    encode(gen_random_bytes(8), 'base64'),
    '+', ''), '/', ''), '=', ''),
  1, 11
)
WHERE share_token IS NOT NULL;
