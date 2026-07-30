-- =============================================================
-- GOZIPP SUPABASE DATABASE SCHEMA
-- PostgreSQL with PostGIS and pg_trgm extensions enabled
-- =============================================================

-- Enable Required Extensions (in Supabase, these require superuser or can be enabled via dashboard)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================
-- DROP EXISTING TABLES AND TYPES (For a clean start)
-- =============================================================
DROP VIEW IF EXISTS v_trip_summary CASCADE;
DROP VIEW IF EXISTS v_active_drivers CASCADE;
DROP TABLE IF EXISTS otps CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS sos_events CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS passkey_credentials CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS wallet CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS driver_training_statuses CASCADE;
DROP TABLE IF EXISTS driver_preferences CASCADE;
DROP TABLE IF EXISTS driver_documents CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS passengers CASCADE;
DROP TABLE IF EXISTS invite_codes CASCADE;
DROP TABLE IF EXISTS stations CASCADE;

DROP TYPE IF EXISTS driver_status CASCADE;
DROP TYPE IF EXISTS driver_approval CASCADE;
DROP TYPE IF EXISTS trip_status CASCADE;
DROP TYPE IF EXISTS auth_provider CASCADE;
DROP TYPE IF EXISTS wallet_txn_type CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS document_type CASCADE;
DROP TYPE IF EXISTS document_status CASCADE;
DROP TYPE IF EXISTS pref_type CASCADE;
DROP TYPE IF EXISTS invite_type CASCADE;
DROP TYPE IF EXISTS sos_status CASCADE;
DROP TYPE IF EXISTS passkey_user_role CASCADE;

-- =============================================================
-- ENUM TYPES
-- =============================================================
CREATE TYPE driver_status AS ENUM ('OFFLINE', 'IDLE', 'BUSY', 'SUSPENDED');
CREATE TYPE driver_approval AS ENUM ('PENDING', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'REUPLOAD_REQUESTED');
CREATE TYPE trip_status AS ENUM ('SEARCHING', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'TIMEOUT_NO_DRIVER');
CREATE TYPE auth_provider AS ENUM ('OTP', 'LINE', 'GOOGLE');
CREATE TYPE wallet_txn_type AS ENUM ('TOPUP', 'DEDUCT', 'REFUND', 'BONUS');
CREATE TYPE payment_method AS ENUM ('PROMPTPAY', 'CASH', 'TRANSFER');
CREATE TYPE document_type AS ENUM ('ID_CARD', 'LICENSE', 'VEHICLE_PHOTO', 'PLATE_NUMBER', 'SELFIE');
CREATE TYPE document_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE pref_type AS ENUM ('ZONE', 'SHIFT', 'SERVICE_TYPE');
CREATE TYPE invite_type AS ENUM ('STATION', 'INDIVIDUAL', 'TEMP');
CREATE TYPE sos_status AS ENUM ('ACTIVE', 'RESOLVED', 'FALSE_ALARM');
CREATE TYPE passkey_user_role AS ENUM ('PASSENGER', 'DRIVER');

-- =============================================================
-- STATIONS / WIN (Motorcycle Taxi Stations)
-- =============================================================
CREATE TABLE stations (
  id           VARCHAR(50) PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  name_en      VARCHAR(200),
  location     GEOMETRY(POINT, 4326) NOT NULL,
  radius_m     INTEGER NOT NULL DEFAULT 100,
  district     VARCHAR(100),
  province     VARCHAR(100) DEFAULT 'กรุงเทพมหานคร',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stations_location ON stations USING GIST (location);

INSERT INTO stations (id, name, name_en, location, radius_m, district) VALUES
  ('WIN-CENTRAL-01', 'วินตลาดกลาง ปทุมวัน', 'Win Central Market Pathumwan', ST_SetSRID(ST_MakePoint(100.5018, 13.7563), 4326), 100, 'ปทุมวัน'),
  ('WIN-TECH-PARK',  'วินหน้าตึก Tech Park พญาไท', 'Win Tech Park Phayathai', ST_SetSRID(ST_MakePoint(100.5380, 13.7650), 4326), 100, 'พญาไท'),
  ('WIN-SUBURB-A',   'วินหมู่บ้าน A สุขุมวิท', 'Win Village A Sukhumvit', ST_SetSRID(ST_MakePoint(100.5600, 13.7200), 4326), 100, 'วัฒนา'),
  ('WIN-SILOM',      'วินสีลม', 'Win Silom', ST_SetSRID(ST_MakePoint(100.5232, 13.7244), 4326), 150, 'บางรัก'),
  ('WIN-LADPRAO',    'วินลาดพร้าว', 'Win Ladprao', ST_SetSRID(ST_MakePoint(100.5630, 13.8120), 4326), 100, 'ลาดพร้าว');

-- =============================================================
-- INVITE CODES
-- =============================================================
CREATE TABLE invite_codes (
  code         VARCHAR(50) PRIMARY KEY,
  station_id   VARCHAR(50) REFERENCES stations(id),
  type         invite_type NOT NULL DEFAULT 'STATION',
  max_uses     INTEGER NOT NULL DEFAULT 100,
  used_count   INTEGER NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ NOT NULL,
  note         TEXT,
  created_by   VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO invite_codes (code, station_id, type, max_uses, expires_at, note) VALUES
  ('WIN888', 'WIN-CENTRAL-01', 'STATION', 100, '2027-12-31T23:59:59Z', 'Default station code');

-- =============================================================
-- PASSENGERS
-- =============================================================
CREATE TABLE passengers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone            VARCHAR(20) UNIQUE,
  name             VARCHAR(200) NOT NULL,
  email            VARCHAR(200),
  avatar_url       TEXT,
  profile_pic_url  TEXT,
  auth_provider    auth_provider NOT NULL DEFAULT 'OTP',
  pin_hash         TEXT,
  provider_id      TEXT,
  webauthn_current_challenge TEXT,
  points_balance   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_rides      INTEGER NOT NULL DEFAULT 0,
  free_rides_remaining INTEGER NOT NULL DEFAULT 3,
  community_points_balance INTEGER NOT NULL DEFAULT 0,
  referral_code    VARCHAR(50),
  referred_by_id   UUID REFERENCES passengers(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_passengers_phone ON passengers(phone);

-- =============================================================
-- DRIVERS
-- =============================================================
CREATE TABLE drivers (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone                    VARCHAR(20) UNIQUE NOT NULL,
  name                     VARCHAR(200) NOT NULL,
  nickname                 VARCHAR(100),
  plate                    VARCHAR(20) NOT NULL,
  line_id                  VARCHAR(100),
  profile_pic_url          TEXT,
  email                    VARCHAR(200),
  auth_provider            auth_provider NOT NULL DEFAULT 'OTP',
  pin_hash                 TEXT,
  provider_id              TEXT,
  webauthn_current_challenge TEXT,
  station_id               VARCHAR(50) REFERENCES stations(id),
  invite_code              VARCHAR(50) REFERENCES invite_codes(code),
  approval_status          driver_approval NOT NULL DEFAULT 'PENDING',
  current_status           driver_status NOT NULL DEFAULT 'OFFLINE',
  current_onboarding_step  INTEGER NOT NULL DEFAULT 1,
  rating                   NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
  total_trips              INTEGER NOT NULL DEFAULT 0,
  total_earnings           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  bank_name                VARCHAR(100),
  bank_account_name        VARCHAR(200),
  bank_account_no          VARCHAR(50),
  promptpay_id             VARCHAR(20),
  tax_id                   VARCHAR(20),
  last_known_location      GEOMETRY(POINT, 4326),
  last_seen_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drivers_phone ON drivers(phone);
CREATE INDEX idx_drivers_station ON drivers(station_id);
CREATE INDEX idx_drivers_approval ON drivers(approval_status);
CREATE INDEX idx_drivers_status ON drivers(current_status);
CREATE INDEX idx_drivers_last_location ON drivers USING GIST (last_known_location);

-- =============================================================
-- DRIVER DOCUMENTS
-- =============================================================
CREATE TABLE driver_documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id    UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  type         document_type NOT NULL,
  url          TEXT NOT NULL,
  status       document_status NOT NULL DEFAULT 'PENDING',
  reject_note  TEXT,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ
);

CREATE INDEX idx_driver_documents_driver ON driver_documents(driver_id);

-- =============================================================
-- DRIVER PREFERENCES
-- =============================================================
CREATE TABLE driver_preferences (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id  UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  type       pref_type NOT NULL,
  value      VARCHAR(100) NOT NULL,
  UNIQUE(driver_id, type, value)
);

-- =============================================================
-- DRIVER TRAINING STATUS
-- =============================================================
CREATE TABLE driver_training_statuses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id     UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  module_id     VARCHAR(50) NOT NULL,
  is_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  UNIQUE(driver_id, module_id)
);

-- =============================================================
-- TRIPS
-- =============================================================
CREATE TABLE trips (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id     UUID NOT NULL REFERENCES passengers(id),
  driver_id        UUID REFERENCES drivers(id),
  station_id       VARCHAR(50) REFERENCES stations(id),
  pickup_location  GEOMETRY(POINT, 4326) NOT NULL,
  pickup_address   TEXT NOT NULL,
  dest_location    GEOMETRY(POINT, 4326) NOT NULL,
  dest_address     TEXT NOT NULL,
  distance_km      NUMERIC(8, 2) NOT NULL DEFAULT 0,
  duration_mins    INTEGER,
  polyline         TEXT,
  fare             NUMERIC(10, 2) NOT NULL DEFAULT 2,
  credits_used     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status           trip_status NOT NULL DEFAULT 'SEARCHING',
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at      TIMESTAMPTZ,
  arrived_at       TIMESTAMPTZ,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  cancel_reason    TEXT,
  passenger_rating INTEGER CHECK (passenger_rating BETWEEN 1 AND 5),
  driver_rating    INTEGER CHECK (driver_rating BETWEEN 1 AND 5),
  passenger_note   TEXT,
  driver_note      TEXT
);

CREATE INDEX idx_trips_passenger ON trips(passenger_id);
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_requested_at ON trips(requested_at DESC);
CREATE INDEX idx_trips_pickup_location ON trips USING GIST (pickup_location);

-- =============================================================
-- CHAT MESSAGES
-- =============================================================
CREATE TABLE chat_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id       UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL,
  sender_type   VARCHAR(10) NOT NULL CHECK (sender_type IN ('DRIVER', 'PASSENGER')),
  content       TEXT NOT NULL,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_trip ON chat_messages(trip_id);
CREATE INDEX idx_chat_created ON chat_messages(created_at DESC);

-- =============================================================
-- WALLET
-- =============================================================
CREATE TABLE wallet (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id  UUID UNIQUE NOT NULL REFERENCES passengers(id),
  point_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- WALLET TRANSACTIONS
-- =============================================================
CREATE TABLE wallet_transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id  UUID NOT NULL REFERENCES passengers(id),
  type          wallet_txn_type NOT NULL,
  point_change  NUMERIC(10, 2) NOT NULL,
  amount_baht   NUMERIC(10, 2),
  reference_id  VARCHAR(100),
  trip_id       UUID REFERENCES trips(id),
  status        VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
  signature     TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_txn_passenger ON wallet_transactions(passenger_id);
CREATE INDEX idx_wallet_txn_created ON wallet_transactions(created_at DESC);
CREATE INDEX idx_wallet_txn_type ON wallet_transactions(type);

-- =============================================================
-- PAYMENT TRANSACTIONS
-- =============================================================
CREATE TABLE payment_transactions (
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

CREATE INDEX idx_payment_txn_passenger ON payment_transactions(passenger_id);
CREATE INDEX idx_payment_txn_status ON payment_transactions(status);
CREATE INDEX idx_payment_txn_created ON payment_transactions(created_at DESC);

-- =============================================================
-- REFRESH TOKENS
-- =============================================================
CREATE TABLE refresh_tokens (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL,
  user_type    VARCHAR(10) NOT NULL CHECK (user_type IN ('DRIVER', 'PASSENGER', 'ADMIN')),
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  is_revoked   BOOLEAN NOT NULL DEFAULT FALSE,
  replaced_by_token_hash TEXT,
  ip_address   VARCHAR(64),
  device_id    VARCHAR(255),
  device_name  VARCHAR(255),
  os           VARCHAR(255),
  browser      VARCHAR(255),
  location     VARCHAR(255),
  last_active_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id, user_type);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- =============================================================
-- PASSKEY CREDENTIALS
-- =============================================================
CREATE TABLE passkey_credentials (
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
CREATE INDEX idx_passkey_credentials_user_id ON passkey_credentials(user_id);

-- =============================================================
-- AUDIT LOGS
-- =============================================================
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID,
  user_type    VARCHAR(20),
  action       VARCHAR(200) NOT NULL,
  resource     VARCHAR(100),
  resource_id  VARCHAR(100),
  ip_address   VARCHAR(64),
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- =============================================================
-- SOS EVENTS
-- =============================================================
CREATE TABLE sos_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL,
  user_type    VARCHAR(10) NOT NULL CHECK (user_type IN ('DRIVER', 'PASSENGER')),
  trip_id      UUID REFERENCES trips(id),
  location     GEOMETRY(POINT, 4326),
  status       sos_status NOT NULL DEFAULT 'ACTIVE',
  notes        TEXT,
  resolved_by  UUID,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sos_status ON sos_events(status);
CREATE INDEX idx_sos_created ON sos_events(created_at DESC);

-- =============================================================
-- PROMOTIONS
-- =============================================================
CREATE TABLE promotions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name               VARCHAR(200) NOT NULL,
  type               VARCHAR(20) NOT NULL CHECK (type IN ('TOPUP_BONUS', 'RIDE_DISCOUNT')),
  description        TEXT,
  min_topup_amount   NUMERIC(10, 2),
  max_prior_rides    INTEGER,
  start_time         TIME,
  end_time           TIME,
  allowed_station_ids TEXT[],
  start_date         DATE,
  end_date           DATE,
  max_usage_per_user INTEGER DEFAULT 0,
  max_total_usage    INTEGER DEFAULT 0,
  current_total_usage INTEGER NOT NULL DEFAULT 0,
  bonus_points       NUMERIC(10, 2),
  is_free_ride       BOOLEAN DEFAULT FALSE,
  discount_amount    NUMERIC(10, 2),
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- OTPS (New Table for Serverless OTP Flow)
-- =============================================================
CREATE TABLE otps (
  phone               VARCHAR(20) PRIMARY KEY,
  otp                 VARCHAR(6) NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_requested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count       INTEGER DEFAULT 1,
  attempt_count       INTEGER DEFAULT 0
);

-- =============================================================
-- UPDATED_AT TRIGGER DEFINITION
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_passengers_updated_at BEFORE UPDATE ON passengers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- DEMO SEED DATA (Development Only)
-- =============================================================
INSERT INTO passengers (id, phone, name, points_balance, free_rides_remaining, auth_provider)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '0899999999',
  'ผู้โดยสารทดสอบ',
  100,
  3,
  'OTP'
) ON CONFLICT (phone) DO NOTHING;

INSERT INTO drivers (id, phone, name, plate, station_id, invite_code, approval_status, current_status, auth_provider)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '0812345678',
  'สมชาย ไรเดอร์',
  '1กข-9999',
  'WIN-CENTRAL-01',
  'WIN888',
  'APPROVED',
  'OFFLINE',
  'OTP'
) ON CONFLICT (phone) DO NOTHING;

INSERT INTO wallet (passenger_id, point_balance)
VALUES ('a0000000-0000-0000-0000-000000000001', 100)
ON CONFLICT (passenger_id) DO NOTHING;

-- =============================================================
-- USEFUL VIEWS
-- =============================================================
CREATE VIEW v_active_drivers AS
SELECT 
  d.id,
  d.name,
  d.plate,
  d.current_status,
  d.rating,
  d.total_trips,
  s.name AS station_name,
  s.id AS station_id,
  ST_AsGeoJSON(d.last_known_location)::json AS location
FROM drivers d
LEFT JOIN stations s ON d.station_id = s.id
WHERE d.approval_status = 'APPROVED'
  AND d.current_status != 'OFFLINE';

CREATE VIEW v_trip_summary AS
SELECT
  t.id,
  t.status,
  t.fare,
  t.distance_km,
  t.requested_at,
  t.completed_at,
  p.name AS passenger_name,
  p.phone AS passenger_phone,
  d.name AS driver_name,
  d.plate AS driver_plate,
  ST_AsGeoJSON(t.pickup_location)::json AS pickup,
  ST_AsGeoJSON(t.dest_location)::json AS destination
FROM trips t
JOIN passengers p ON t.passenger_id = p.id
LEFT JOIN drivers d ON t.driver_id = d.id;

-- =============================================================
-- ROW LEVEL SECURITY (RLS) & SECURITY POLICIES
-- =============================================================

-- 1. Passengers Table RLS
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow passengers to read own profile"
  ON passengers FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Allow passengers to update own profile"
  ON passengers FOR UPDATE
  USING (auth.uid() = id);

-- 2. Drivers Table RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow drivers to read own profile"
  ON drivers FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Allow drivers to update own profile"
  ON drivers FOR UPDATE
  USING (auth.uid() = id);

-- 3. Trips Table RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view own trips"
  ON trips FOR SELECT
  USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

CREATE POLICY "Allow users to update own trips"
  ON trips FOR UPDATE
  USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

CREATE POLICY "Allow users to insert own trips"
  ON trips FOR INSERT
  WITH CHECK (auth.uid() = passenger_id);

-- 4. Chat Messages Table RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read chats from own trips"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = chat_messages.trip_id
        AND (trips.passenger_id = auth.uid() OR trips.driver_id = auth.uid())
    )
  );

CREATE POLICY "Allow users to insert chats into own trips"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = chat_messages.trip_id
        AND (trips.passenger_id = auth.uid() OR trips.driver_id = auth.uid())
    )
  );

-- 5. Wallet Table RLS
ALTER TABLE wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read own wallet balance"
  ON wallet FOR SELECT
  USING (auth.uid() = passenger_id);

-- 6. Wallet Transactions Table RLS
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view own wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = passenger_id);

-- 7. Refresh Tokens Table RLS
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view own sessions"
  ON refresh_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update own sessions"
  ON refresh_tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- 8. SOS Events Table RLS
ALTER TABLE sos_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view own SOS alerts"
  ON sos_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow users to trigger SOS alerts"
  ON sos_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 9. Audit Logs Table RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow security roles to view audit logs"
  ON audit_logs FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'SECURITY'
    OR auth.jwt() ->> 'role' = 'SUPERADMIN'
    OR auth.jwt() ->> 'role' = 'SUPER'
  );

