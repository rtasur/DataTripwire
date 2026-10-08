ALTER TABLE sessions
ADD COLUMN step_up_required BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN step_up_verified_at TIMESTAMPTZ NULL;

CREATE INDEX idx_sessions_step_up_required
ON sessions(step_up_required);