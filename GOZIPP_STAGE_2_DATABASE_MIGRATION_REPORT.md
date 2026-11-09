# GOZIPP Stage 2 Database Migration & Schema Report
**Document ID:** GOZIPP-STAGE-2-DB-MIGRATION-REPORT  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** STAGE 2 — Gate 2.3 & Gate 2.4  
**Date:** 2026-11-08  
**Migration Engine:** NestJS `DatabaseMigrationService` (`packages/api/database/database-migration.service.ts`)  
**Status:** APPLIED & VERIFIED  

---

## 1. Schema Expansion Overview

The database was upgraded using an **Expand-and-Contract** methodology. All schema updates are 100% additive:
* Zero existing tables were dropped or altered destructively.
* Zero existing columns were renamed or removed.
* Legacy columns `drivers.plate` and `drivers.station_id` remain intact.

---

## 2. Table Specifications & Indexes

### 2.1 Table: `driver_vehicles`
Stores all multi-vehicle registrations per driver across motorcycles, public taxis, and private hire cars.

```sql
CREATE TABLE IF NOT EXISTS driver_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'MOTORCYCLE',
    plate VARCHAR(50) NOT NULL,
    province VARCHAR(100) NOT NULL DEFAULT 'กรุงเทพมหานคร',
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL,
    year INTEGER,
    passenger_capacity INTEGER NOT NULL DEFAULT 1,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    tax_expiry_date DATE,
    insurance_expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_vehicles_driver_id ON driver_vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_verification_status ON driver_vehicles(verification_status);
```

### 2.2 Table: `vehicle_documents`
Stores KYC and statutory documentation required for DLT compliance (meter certs, insurance policies, car photos).

```sql
CREATE TABLE IF NOT EXISTS vehicle_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_url TEXT NOT NULL,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id ON vehicle_documents(vehicle_id);
```

### 2.3 Table: `driver_service_profiles`
Manages independent mobility service status (`MOTO` vs `TAXI`), active vehicle bindings, and online presence.

```sql
CREATE TABLE IF NOT EXISTS driver_service_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL,
    service_type VARCHAR(20) NOT NULL,
    active_vehicle_id UUID,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    eligibility_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_driver_service_profile UNIQUE (driver_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_driver_service_profiles_driver ON driver_service_profiles(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_service_profiles_online ON driver_service_profiles(service_type, is_online, eligibility_status);
```

### 2.4 Table: `driver_active_assignments` (Global Active Ride Lock - P0)
PostgreSQL-backed concurrency lock ensuring that a driver account can hold no more than one active trip across all mobility services.

```sql
CREATE TABLE IF NOT EXISTS driver_active_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL UNIQUE,
    trip_id UUID NOT NULL UNIQUE,
    service_type VARCHAR(20) NOT NULL,
    vehicle_id UUID NOT NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'ACCEPTED',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_active_assignments_driver ON driver_active_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_active_assignments_trip ON driver_active_assignments(trip_id);
```

### 2.5 Table Extension: `trips`
Extended `trips` to associate service types and vehicles with historical and active trips.

```sql
ALTER TABLE trips ADD COLUMN IF NOT EXISTS service_type VARCHAR(20) DEFAULT 'MOTO';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS vehicle_id UUID;
CREATE INDEX IF NOT EXISTS idx_trips_service_status ON trips(service_type, status);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON trips(vehicle_id);
```

---

## 3. Gate 2.4 Legacy Data Backfill Execution

Existing motorcycle taxi drivers registered under legacy single-plate schema were safely migrated using the following idempotent SQL script executed during `OnModuleInit`:

```sql
-- 1. Backfill legacy motorcycle into driver_vehicles with LEGACY_REVIEW
INSERT INTO driver_vehicles (
  id, driver_id, category, plate, province, brand, model, color, passenger_capacity, verification_status, created_at, updated_at
)
SELECT 
  uuid_generate_v4(),
  d.id,
  'MOTORCYCLE',
  COALESCE(NULLIF(d.plate, ''), 'UNKNOWN'),
  'กรุงเทพมหานคร',
  'Motorcycle',
  'Standard',
  'Unknown',
  1,
  'LEGACY_REVIEW',
  NOW(),
  NOW()
FROM drivers d
WHERE NOT EXISTS (
  SELECT 1 FROM driver_vehicles dv WHERE dv.driver_id = d.id
);

-- 2. Create default MOTO service profiles for existing drivers
INSERT INTO driver_service_profiles (
  id, driver_id, service_type, active_vehicle_id, is_enabled, is_online, eligibility_status, created_at, updated_at
)
SELECT 
  uuid_generate_v4(),
  d.id,
  'MOTO',
  (SELECT dv.id FROM driver_vehicles dv WHERE dv.driver_id = d.id LIMIT 1),
  TRUE,
  (d.current_status != 'OFFLINE'),
  'ELIGIBLE',
  NOW(),
  NOW()
FROM drivers d
WHERE NOT EXISTS (
  SELECT 1 FROM driver_service_profiles dsp WHERE dsp.driver_id = d.id AND dsp.service_type = 'MOTO'
);
```

### Data Gating Safety Highlights:
1. **No False VERIFIED Status:** Legacy vehicles were classified as `LEGACY_REVIEW`, strictly avoiding automatic assignment of `VERIFIED` without physical inspection evidence.
2. **Zero MOTO Service Interruption:** MOTO profile eligibility was set to `ELIGIBLE` allowing existing drivers to continue normal motorcycle operations without administrative lockdown.
3. **Idempotency Guarantee:** `WHERE NOT EXISTS` clauses prevent duplicate rows on reboots or repeated migrations.
