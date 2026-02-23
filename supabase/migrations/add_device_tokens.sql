-- Device tokens for push notifications
CREATE TABLE device_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL,
    token text NOT NULL,
    platform text NOT NULL DEFAULT 'ios',
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, token)
);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tokens"
    ON device_tokens FOR ALL
    USING (auth.uid() = user_id);
