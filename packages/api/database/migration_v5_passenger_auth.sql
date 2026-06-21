-- Passenger authentication hardening and entity/schema alignment.
-- Safe to run repeatedly before deploying the updated API.

ALTER TABLE passengers ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS webauthn_current_challenge TEXT;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES passengers(id);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS webauthn_current_challenge TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_passengers_phone_unique
  ON passengers (phone)
  WHERE phone IS NOT NULL;

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS replaced_by_token_hash TEXT;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS device_id VARCHAR(255);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS device_name VARCHAR(255);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS os VARCHAR(255);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS browser VARCHAR(255);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

DO $$ BEGIN
  CREATE TYPE passkey_user_role AS ENUM ('PASSENGER', 'DRIVER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS passkey_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  user_role passkey_user_role NOT NULL,
  credential_id TEXT UNIQUE NOT NULL,
  credential_public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  credential_device_type VARCHAR(100),
  credential_backed_up BOOLEAN NOT NULL DEFAULT FALSE,
  transports JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passkey_credentials_user_id
  ON passkey_credentials (user_id);
