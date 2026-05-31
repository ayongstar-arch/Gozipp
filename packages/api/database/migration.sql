-- GOZIPP Database Migration Script
-- Upgrades schema to support PostGIS spatial indexing for real-time tracking and proximity calculations.

-- 1. Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Add location column to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location GEOMETRY(Point, 4326);

-- 3. Create spatial index on drivers.location using GIST
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers USING GIST(location);

-- 4. Add location columns to trips table for pickup and destination geometries
ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_location GEOMETRY(Point, 4326);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS dest_location GEOMETRY(Point, 4326);

-- 5. Create spatial indexes on trips locations
CREATE INDEX IF NOT EXISTS idx_trips_pickup_location ON trips USING GIST(pickup_location);
CREATE INDEX IF NOT EXISTS idx_trips_dest_location ON trips USING GIST(dest_location);

-- 6. Create stations table for win centers
CREATE TABLE IF NOT EXISTS stations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    radius DOUBLE PRECISION DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_stations_location ON stations USING GIST(location);
