CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  device_id_hash TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,

  user_agent TEXT,
  ip_address TEXT,

  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS sessions_user_device_active_unique
ON sessions (user_id, device_id_hash)
WHERE revoked_at IS NULL;
