-- Content Reporting & User Blocking
-- App Store requirement: reporting/blocking for user-generated content

-- ============================================================
-- 1. content_reports — unified for lyrics + comments
-- ============================================================
CREATE TABLE IF NOT EXISTS content_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type text NOT NULL CHECK (content_type IN ('lyric', 'comment')),
    content_id uuid NOT NULL,
    reason text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- One report per user per content item
CREATE UNIQUE INDEX idx_content_reports_unique
    ON content_reports (reporter_id, content_type, content_id);

-- Fast threshold counting
CREATE INDEX idx_content_reports_content
    ON content_reports (content_type, content_id);

-- RLS
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reports"
    ON content_reports FOR INSERT
    WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view own reports"
    ON content_reports FOR SELECT
    USING (reporter_id = auth.uid());

-- ============================================================
-- 2. user_blocks
-- ============================================================
CREATE TABLE IF NOT EXISTS user_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (blocker_id != blocked_user_id)
);

CREATE UNIQUE INDEX idx_user_blocks_unique
    ON user_blocks (blocker_id, blocked_user_id);

-- RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own blocks"
    ON user_blocks FOR INSERT
    WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete own blocks"
    ON user_blocks FOR DELETE
    USING (blocker_id = auth.uid());

CREATE POLICY "Users can view own blocks"
    ON user_blocks FOR SELECT
    USING (blocker_id = auth.uid());

-- ============================================================
-- 3. Auto-hide trigger: 3 reports → hide content
-- ============================================================
CREATE OR REPLACE FUNCTION auto_hide_reported_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    report_count int;
BEGIN
    SELECT count(*) INTO report_count
    FROM content_reports
    WHERE content_type = NEW.content_type
      AND content_id = NEW.content_id;

    IF report_count >= 3 THEN
        IF NEW.content_type = 'lyric' THEN
            UPDATE lyrics SET is_public = false WHERE id = NEW.content_id;
        ELSIF NEW.content_type = 'comment' THEN
            DELETE FROM comments WHERE id = NEW.content_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_hide_reported_content
    AFTER INSERT ON content_reports
    FOR EACH ROW
    EXECUTE FUNCTION auto_hide_reported_content();
