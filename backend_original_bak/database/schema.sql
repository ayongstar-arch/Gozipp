-- =============================================================
-- GOZIPP PRODUCTION DATABASE SCHEMA
-- PostgreSQL 15+ with PostGIS 3.x
-- Version: 3.0 Production
-- =============================================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy address search

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

-- =============================================================
-- STATIONS / WIN (Motorcycle Taxi Stations)
-- =============================================================

CREATE TABLE stations (
  id           VARCHAR(50) PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  name_en      VARCHAR(200),
  -- PostGIS geometry for precise geospatial queries
  location     GEOMETRY(POINT, 4326) NOT NULL,
  radius_m     INTEGER NOT NULL DEFAULT 100,
  district     VARCHAR(100),
  province     VARCHAR(100) DEFAULT 'กรุงเทพมหานคร',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index for fast nearby-station queries
CREATE INDEX idx_stations_location ON stations USING GIST (location);

-- Seed Bangkok stations
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
  phone            VARCHAR(20) UNIQUE NOT NULL,
  name             VARCHAR(200) NOT NULL,
  email            VARCHAR(200),
  avatar_url       TEXT,
  profile_pic_url  TEXT,

  -- Auth
  auth_provider    auth_provider NOT NULL DEFAULT 'OTP',
  pin_hash         TEXT,           -- bcrypt hash of 6-digit PIN
  provider_id      TEXT,           -- LINE userId or Google sub

  -- Credits / Wallet
  points_balance   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_rides      INTEGER NOT NULL DEFAULT 0,
  free_rides_remaining INTEGER NOT NULL DEFAULT 3,

  -- Referral
  referral_code    VARCHAR(50),    -- Driver referral code used at registration

  -- Timestamps
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

  -- Auth
  auth_provider            auth_provider NOT NULL DEFAULT 'OTP',
  pin_hash                 TEXT,
  provider_id              TEXT,

  -- Station Assignment
  station_id               VARCHAR(50) REFERENCES stations(id),
  invite_code              VARCHAR(50) REFERENCES invite_codes(code),

  -- Status & Approval
  approval_status          driver_approval NOT NULL DEFAULT 'PENDING',
  current_status           driver_status NOT NULL DEFAULT 'OFFLINE',
  current_onboarding_step  INTEGER NOT NULL DEFAULT 1,

  -- Performance
  rating                   NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
  total_trips              INTEGER NOT NULL DEFAULT 0,
  total_earnings           NUMERIC(12, 2) NOT NULL DEFAULT 0,

  -- Payout (future-ready)
  bank_name                VARCHAR(100),
  bank_account_name        VARCHAR(200),
  bank_account_no          VARCHAR(50),
  promptpay_id             VARCHAR(20),
  tax_id                   VARCHAR(20),

  -- Live location (updated via Redis, stored here for recovery)
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

  -- Pickup & Destination (PostGIS Points)
  pickup_location  GEOMETRY(POINT, 4326) NOT NULL,
  pickup_address   TEXT NOT NULL,
  dest_location    GEOMETRY(POINT, 4326) NOT NULL,
  dest_address     TEXT NOT NULL,

  -- Routing
  distance_km      NUMERIC(8, 2) NOT NULL DEFAULT 0,
  duration_mins    INTEGER,
  polyline         TEXT,           -- Encoded route polyline

  -- Pricing & Payment
  fare             NUMERIC(10, 2) NOT NULL DEFAULT 2,
  credits_used     NUMERIC(10, 2) NOT NULL DEFAULT 0,

  -- Status Machine
  status           trip_status NOT NULL DEFAULT 'SEARCHING',

  -- Timestamps
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at      TIMESTAMPTZ,
  arrived_at       TIMESTAMPTZ,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  cancel_reason    TEXT,

  -- Rating
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
  signature     TEXT,                -- HMAC signature for integrity
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_txn_passenger ON wallet_transactions(passenger_id);
CREATE INDEX idx_wallet_txn_created ON wallet_transactions(created_at DESC);
CREATE INDEX idx_wallet_txn_type ON wallet_transactions(type);

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
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id, user_type);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- =============================================================
-- AUDIT LOG
-- =============================================================

CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID,
  user_type    VARCHAR(20),
  action       VARCHAR(200) NOT NULL,
  resource     VARCHAR(100),
  resource_id  VARCHAR(100),
  ip_address   INET,
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

  -- Conditions
  min_topup_amount   NUMERIC(10, 2),
  max_prior_rides    INTEGER,
  start_time         TIME,
  end_time           TIME,
  allowed_station_ids TEXT[],

  -- Time Activation
  start_date         DATE,
  end_date           DATE,

  -- Anti-Abuse
  max_usage_per_user INTEGER DEFAULT 0,
  max_total_usage    INTEGER DEFAULT 0,
  current_total_usage INTEGER NOT NULL DEFAULT 0,

  -- Benefits
  bonus_points       NUMERIC(10, 2),
  is_free_ride       BOOLEAN DEFAULT FALSE,
  discount_amount    NUMERIC(10, 2),

  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- UPDATED_AT AUTO-UPDATE TRIGGER
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

-- Demo Passenger
INSERT INTO passengers (id, phone, name, points_balance, free_rides_remaining, auth_provider)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '0899999999',
  'ผู้โดยสารทดสอบ',
  100,
  3,
  'OTP'
) ON CONFLICT (phone) DO NOTHING;

-- Demo Driver
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

-- Demo Wallet
INSERT INTO wallet (passenger_id, point_balance)
VALUES ('a0000000-0000-0000-0000-000000000001', 100)
ON CONFLICT (passenger_id) DO NOTHING;

-- =============================================================
-- USEFUL VIEWS
-- =============================================================

-- Active drivers with their station info
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

-- Trip summary with passenger and driver
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
