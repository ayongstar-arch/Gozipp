-- WINNO PLATFORM - POSTGRESQL PRODUCTION SCHEMA (v1)
-- Optimized for High-Concurrency Mobility Services

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For Geospatial queries

-- 2. Enums
CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED');
CREATE TYPE driver_status AS ENUM ('OFFLINE', 'IDLE', 'BUSY');
CREATE TYPE trip_status AS ENUM ('SEARCHING', 'ACCEPTED', 'ARRIVED', 'PICKED_UP', 'COMPLETED', 'CANCELLED');

-- 3. Drivers Table
CREATE TABLE drivers (
    id VARCHAR(20) PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    plate VARCHAR(50) NOT NULL,
    invite_code VARCHAR(20),
    win_id VARCHAR(50) NOT NULL,
    approval_status approval_status DEFAULT 'PENDING',
    current_status driver_status DEFAULT 'OFFLINE',
    rating FLOAT DEFAULT 5.0,
    total_trips INTEGER DEFAULT 0,
    profile_pic_url TEXT,
    auth_provider VARCHAR(20),
    provider_id VARCHAR(255),
    pin_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Passengers Table
CREATE TABLE passengers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    balance INTEGER DEFAULT 0,
    referral_code VARCHAR(20),
    pin_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Trips Table
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID REFERENCES passengers(id),
    driver_id VARCHAR(20) REFERENCES drivers(id),
    status trip_status DEFAULT 'SEARCHING',
    pickup_address TEXT NOT NULL,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    dest_address TEXT NOT NULL,
    dest_lat DOUBLE PRECISION NOT NULL,
    dest_lng DOUBLE PRECISION NOT NULL,
    fare_points INTEGER DEFAULT 2,
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Wallet System
CREATE TABLE wallet (
    passenger_id UUID PRIMARY KEY REFERENCES passengers(id),
    point_balance NUMERIC(10, 2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID REFERENCES passengers(id),
    type VARCHAR(20) NOT NULL, -- TOPUP, DEDUCT, REFUND
    point_change NUMERIC(10, 2) NOT NULL,
    amount_baht NUMERIC(10, 2) DEFAULT 0.00,
    reference_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'SUCCESS',
    signature TEXT, -- HMAC signature for integrity
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Audit Logs
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    user_type VARCHAR(20),
    action VARCHAR(255) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Indexes
CREATE INDEX idx_drivers_win_id ON drivers(win_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_trips_passenger_id ON trips(passenger_id);
