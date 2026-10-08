ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS baseline_eligible BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_sessions_baseline_eligible
ON sessions (user_id, baseline_eligible);