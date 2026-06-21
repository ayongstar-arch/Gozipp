-- Payment transaction ledger for top-up intents and webhook confirmation.
-- Safe to run repeatedly before deploying the updated API.

CREATE TABLE IF NOT EXISTS payment_transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id     UUID NOT NULL REFERENCES passengers(id),
  payment_ref      VARCHAR(100) NOT NULL UNIQUE,
  idempotency_key  VARCHAR(150) UNIQUE,
  provider_name    VARCHAR(50) NOT NULL DEFAULT 'PROMPTPAY',
  payment_method   payment_method NOT NULL DEFAULT 'PROMPTPAY',
  amount_baht      NUMERIC(10, 2) NOT NULL,
  bonus_points     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  provider_payload JSONB,
  signature        TEXT,
  confirmed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_txn_passenger
  ON payment_transactions (passenger_id);

CREATE INDEX IF NOT EXISTS idx_payment_txn_status
  ON payment_transactions (status);

CREATE INDEX IF NOT EXISTS idx_payment_txn_created
  ON payment_transactions (created_at DESC);
