-- Schema for docs/CONTRACTS.md "Persistence and queue semantics" (contract schema version 1).
-- Payloads are opaque JSON validated against the generated models in services/routes, not here.
-- CHECK constraints are defense in depth for contract rules; the contract stays normative.
-- Timestamps are RFC 3339 UTC strings.

CREATE TABLE sessions (
    id          TEXT PRIMARY KEY,
    created_at  TEXT NOT NULL,
    expires_at  TEXT NOT NULL
) STRICT;
CREATE INDEX sessions_expires_at ON sessions (expires_at);

CREATE TABLE cases (
    id            TEXT PRIMARY KEY,
    payload_json  TEXT NOT NULL CHECK (json_valid(payload_json)),
    source_hash   TEXT NOT NULL
) STRICT;

CREATE TABLE jobs (
    id                TEXT PRIMARY KEY,
    session_id        TEXT NOT NULL REFERENCES sessions (id),
    kind              TEXT NOT NULL CHECK (kind IN ('scenario', 'explanation')),
    lane              TEXT NOT NULL CHECK (lane IN ('compute', 'io')),
    state             TEXT NOT NULL CHECK (state IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
    payload_json      TEXT NOT NULL CHECK (json_valid(payload_json)),
    progress          REAL NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 1),
    result_id         TEXT,
    error_json        TEXT CHECK (error_json IS NULL OR json_valid(error_json)),
    cancel_requested  INTEGER NOT NULL DEFAULT 0 CHECK (cancel_requested IN (0, 1)),
    lease_owner       TEXT,
    lease_expires_at  TEXT,
    attempt           INTEGER NOT NULL DEFAULT 0 CHECK (attempt >= 0),
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL,
    -- JobRecord rules: queued/running carry no result or error; succeeded needs result, progress 1, no error;
    -- failed needs an error and no result. (cancelled is unconstrained by the contract.)
    CHECK (state NOT IN ('queued', 'running') OR (result_id IS NULL AND error_json IS NULL)),
    CHECK (state <> 'succeeded' OR (result_id IS NOT NULL AND error_json IS NULL AND progress = 1)),
    CHECK (state <> 'failed' OR (error_json IS NOT NULL AND result_id IS NULL))
) STRICT;
-- claim_next and per-lane queue-capacity counts: WHERE lane = ? AND state = 'queued' ORDER BY created_at
CREATE INDEX jobs_lane_state_created ON jobs (lane, state, created_at);
-- expired-lease sweep for interrupted-job recovery: WHERE state = 'running' AND lease_expires_at < ?
CREATE INDEX jobs_state_lease ON jobs (state, lease_expires_at);
-- a session's own jobs
CREATE INDEX jobs_session_created ON jobs (session_id, created_at);

CREATE TABLE results (
    id             TEXT PRIMARY KEY,
    session_id     TEXT NOT NULL REFERENCES sessions (id),
    payload_json   TEXT NOT NULL CHECK (json_valid(payload_json)),
    model_version  TEXT NOT NULL,
    created_at     TEXT NOT NULL
) STRICT;
CREATE INDEX results_session_created ON results (session_id, created_at);

-- result_id is the explained ScenarioResult; the explanation's own id is the job's result_id.
CREATE TABLE explanations (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES sessions (id),
    result_id     TEXT NOT NULL REFERENCES results (id),
    payload_json  TEXT NOT NULL CHECK (json_valid(payload_json)),
    created_at    TEXT NOT NULL
) STRICT;
CREATE INDEX explanations_session ON explanations (session_id, created_at);
CREATE INDEX explanations_result ON explanations (result_id);

CREATE TABLE cache (
    key           TEXT PRIMARY KEY,
    payload_json  TEXT NOT NULL CHECK (json_valid(payload_json)),
    source        TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    expires_at    TEXT
) STRICT;
CREATE INDEX cache_expires_at ON cache (expires_at);

CREATE TABLE idempotency (
    session_id     TEXT NOT NULL REFERENCES sessions (id),
    key            TEXT NOT NULL,
    request_hash   TEXT NOT NULL,
    response_json  TEXT NOT NULL CHECK (json_valid(response_json)),
    created_at     TEXT NOT NULL,
    PRIMARY KEY (session_id, key)
) STRICT;
