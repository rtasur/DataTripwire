BEGIN;

-- ============================================================
-- DataTripwire — Initial Zero Trust Schema
-- ============================================================

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_status_check
        CHECK (status IN ('active', 'suspended', 'disabled'))
);

-- ------------------------------------------------------------
-- SESSIONS
-- ------------------------------------------------------------
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    device_id VARCHAR(255),
    ip_address INET,
    location VARCHAR(255),
    user_agent TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,

    CONSTRAINT sessions_status_check
        CHECK (status IN ('active', 'ended', 'restricted', 'quarantined'))
);

CREATE INDEX idx_sessions_user_id
    ON sessions(user_id);

CREATE INDEX idx_sessions_status
    ON sessions(status);

CREATE INDEX idx_sessions_last_activity
    ON sessions(last_activity_at);

-- ------------------------------------------------------------
-- BEHAVIOR EVENTS
-- ------------------------------------------------------------
CREATE TABLE behavior_events (
    id BIGSERIAL PRIMARY KEY,

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

    event_type VARCHAR(100) NOT NULL,
    resource VARCHAR(500),
    method VARCHAR(20),

    device_id VARCHAR(255),
    ip_address INET,
    location VARCHAR(255),

    request_count INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_behavior_events_user_id
    ON behavior_events(user_id);

CREATE INDEX idx_behavior_events_session_id
    ON behavior_events(session_id);

CREATE INDEX idx_behavior_events_type
    ON behavior_events(event_type);

CREATE INDEX idx_behavior_events_occurred_at
    ON behavior_events(occurred_at);

-- ------------------------------------------------------------
-- USER BASELINES
-- ------------------------------------------------------------
CREATE TABLE user_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    usual_login_hour_start SMALLINT,
    usual_login_hour_end SMALLINT,

    avg_requests_per_minute NUMERIC(10,2) NOT NULL DEFAULT 0,
    avg_resources_per_session NUMERIC(10,2) NOT NULL DEFAULT 0,

    known_devices JSONB NOT NULL DEFAULT '[]'::jsonb,
    known_locations JSONB NOT NULL DEFAULT '[]'::jsonb,
    common_resource_types JSONB NOT NULL DEFAULT '[]'::jsonb,

    sample_count INTEGER NOT NULL DEFAULT 0,

    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- RISK DECISIONS
-- ------------------------------------------------------------
CREATE TABLE risk_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

    previous_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    new_score NUMERIC(5,2) NOT NULL,

    decision VARCHAR(30) NOT NULL,

    risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,

    explanation TEXT NOT NULL,

    policy_id VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT risk_score_range
        CHECK (
            previous_score >= 0
            AND previous_score <= 100
            AND new_score >= 0
            AND new_score <= 100
        ),

    CONSTRAINT risk_decision_check
        CHECK (
            decision IN (
                'ALLOW',
                'MONITOR',
                'VERIFY',
                'RESTRICT',
                'QUARANTINE'
            )
        )
);

CREATE INDEX idx_risk_decisions_user_id
    ON risk_decisions(user_id);

CREATE INDEX idx_risk_decisions_session_id
    ON risk_decisions(session_id);

CREATE INDEX idx_risk_decisions_created_at
    ON risk_decisions(created_at);

-- ------------------------------------------------------------
-- AUDIT LOGS
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,

    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    risk_decision_id UUID REFERENCES risk_decisions(id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,

    previous_state VARCHAR(100),
    new_state VARCHAR(100),

    details JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id
    ON audit_logs(user_id);

CREATE INDEX idx_audit_logs_session_id
    ON audit_logs(session_id);

CREATE INDEX idx_audit_logs_created_at
    ON audit_logs(created_at);

COMMIT;