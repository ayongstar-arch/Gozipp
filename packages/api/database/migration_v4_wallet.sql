-- ============================================================================
-- Migration V4: Wallet & Ledger Architecture
-- GOZIPP Admin Backend — Phase 4
--
-- This migration creates the wallet and ledger_entries tables for the
-- point-based wallet system. All operations are idempotent (safe to re-run).
--
-- Schema design:
--   wallets          — one wallet per user (driver or passenger)
--   ledger_entries   — append-only double-entry log of all balance changes
--
-- Financial invariant:
--   wallet.balance == SUM(CASE WHEN type='CREDIT' THEN amount ELSE -amount END)
--                     FROM ledger_entries WHERE wallet_id = wallet.id
-- ============================================================================

-- -------------------------------------------------------
-- 1. ENUM TYPES
-- -------------------------------------------------------

-- Wallet status lifecycle: ACTIVE → FROZEN → CLOSED
DO $$ BEGIN
  CREATE TYPE wallet_status AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Owner types (mirrors UserRole subset relevant for wallets)
DO $$ BEGIN
  CREATE TYPE wallet_owner_type AS ENUM ('DRIVER', 'PASSENGER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ledger entry direction
DO $$ BEGIN
  CREATE TYPE ledger_type AS ENUM ('CREDIT', 'DEBIT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- What business event triggered this ledger entry
DO $$ BEGIN
  CREATE TYPE ledger_ref_type AS ENUM (
    'TOPUP',           -- Real-money or admin top-up
    'RIDE_FEE',        -- Deducted when passenger takes a ride
    'REFERRAL_BONUS',  -- Credited via referral program
    'PROMO_BONUS',     -- Credited via promotional campaign
    'REFUND',          -- Ride cancellation / dispute refund
    'ADJUSTMENT'       -- Manual admin adjustment (requires audit trail)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------------------------------
-- 2. WALLETS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner reference (not a strict FK — user tables may vary)
  owner_id      VARCHAR(255) NOT NULL,
  owner_type    wallet_owner_type NOT NULL,

  -- Financial state
  balance       DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  currency      VARCHAR(10) NOT NULL DEFAULT 'THB',

  -- Lifecycle
  status        wallet_status NOT NULL DEFAULT 'ACTIVE',

  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure one wallet per owner+type combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_owner
  ON wallets (owner_id, owner_type);

-- Fast lookup by owner_id alone (for admin searches)
CREATE INDEX IF NOT EXISTS idx_wallets_owner_id
  ON wallets (owner_id);

COMMENT ON TABLE wallets IS
  'Stores point-balance wallets for drivers and passengers. One wallet per owner+type.';
COMMENT ON COLUMN wallets.balance IS
  'Current point balance. Always kept in sync with ledger_entries via SERIALIZABLE transactions.';

-- -------------------------------------------------------
-- 3. LEDGER ENTRIES TABLE (Append-Only)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS ledger_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FK to wallets
  wallet_id       UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,

  -- Entry details
  type            ledger_type NOT NULL,
  amount          DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  balance_after   DECIMAL(12, 2) NOT NULL,

  -- Business reference
  reference_type  ledger_ref_type NOT NULL,
  reference_id    VARCHAR(255),          -- External ID (payment ref, trip ID, etc.)

  -- Human-readable context
  description     TEXT,

  -- Who created this entry (admin user ID for manual adjustments, NULL for system)
  created_by      VARCHAR(255),

  -- Immutable timestamp
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query pattern: "show me history for wallet X"
CREATE INDEX IF NOT EXISTS idx_ledger_wallet_id
  ON ledger_entries (wallet_id);

-- Filter by reference type (e.g., find all ADJUSTMENT entries)
CREATE INDEX IF NOT EXISTS idx_ledger_reference_type
  ON ledger_entries (reference_type);

-- Chronological ordering within a wallet
CREATE INDEX IF NOT EXISTS idx_ledger_wallet_created
  ON ledger_entries (wallet_id, created_at DESC);

COMMENT ON TABLE ledger_entries IS
  'Append-only ledger for all wallet balance changes. Never update or delete rows.';
COMMENT ON COLUMN ledger_entries.balance_after IS
  'Wallet balance immediately after this entry was applied. Enables point-in-time balance reconstruction.';
COMMENT ON COLUMN ledger_entries.created_by IS
  'Admin user ID when entry is a manual ADJUSTMENT. NULL for system-generated entries.';
