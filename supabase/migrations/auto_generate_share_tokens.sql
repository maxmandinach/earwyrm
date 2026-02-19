-- Migration: Auto-generate share tokens on all lyrics
-- Ensures notification links always have a valid /s/{token} route.

-- ========================================
-- 1. BEFORE INSERT trigger: auto-generate share_token
-- ========================================
CREATE OR REPLACE FUNCTION auto_generate_share_token()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.share_token IS NULL THEN
    NEW.share_token := substr(
      replace(replace(replace(
        encode(gen_random_bytes(8), 'base64'),
        '+', ''), '/', ''), '=', ''),
      1, 11
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_share_token ON lyrics;
CREATE TRIGGER trg_auto_share_token
  BEFORE INSERT ON lyrics
  FOR EACH ROW EXECUTE FUNCTION auto_generate_share_token();

-- ========================================
-- 2. Backfill existing lyrics missing share_token
-- ========================================
UPDATE lyrics
SET share_token = substr(
  replace(replace(replace(
    encode(gen_random_bytes(8), 'base64'),
    '+', ''), '/', ''), '=', ''),
  1, 11
)
WHERE share_token IS NULL;

-- ========================================
-- 3. Backfill notifications that have a lyric_id but no share_token
-- ========================================
UPDATE notifications n
SET share_token = l.share_token
FROM lyrics l
WHERE n.lyric_id = l.id
  AND n.share_token IS NULL
  AND l.share_token IS NOT NULL;
