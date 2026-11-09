# GOZIPP Stage 2.2 Migration Plan & Execution Specification
**Document ID:** GOZIPP-STAGE-2-2-MIGRATION-PLAN  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** STAGE 2 — Gate 2.2 Database Preparation  
**Target Environment:** Isolated Staging / Development  
**Date:** 2026-11-08  
**Status:** APPROVED & READY FOR GATE 2.3 EXECUTION  

---

## 1. Migration Strategy: Expand and Contract (Additive-First)

To guarantee zero downtime and 100% backward compatibility for existing MOTO drivers and riders:
1. **Never Drop or Rename Existing Columns:**
   * `drivers.plate` remains intact and synchronized.
   * `drivers.station_id` remains intact for MOTO Win station assignments.
   * `trips` schema retains all existing columns.
2. **Strictly Additive Schema Changes:**
   * New relational tables: `driver_vehicles`, `vehicle_documents`, `driver_service_profiles`, and `driver_active_assignments`.
   * Additive column extensions on `trips`: `service_type` (default `'MOTO'`) and `vehicle_id` (nullable foreign key).
3. **Automated Idempotent DDL Execution:**
   * Handled inside `DatabaseMigrationService` using `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and `CREATE INDEX IF NOT EXISTS`.

---

## 2. DDL Execution Sequence

### Phase 1: Create `driver_vehicles`
```sql
CREATE TABLE IF NOT EXISTS driver_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL CHECK (category IN ('MOTORCYCLE', 'PUBLIC_TAXI', 'PRIVATE_CAR_FOR_HIRE')),
    plate VARCHAR(20) NOT NULL,
    province VARCHAR(50) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    color VARCHAR(30) NOT NULL,
    year INT NULL,
    passenger_capacity INT NOT NULL DEFAULT 1,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' 
        CHECK (verification_status IN ('PENDING', 'LEGACY_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'SUSPENDED')),
    rejection_reason TEXT NULL,
    verified_at TIMESTAMPTZ NULL,
    verified_by UUID NULL,
    tax_expiry_date DATE NULL,
    insurance_expiry_date DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_vehicles_driver_id ON driver_vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_verification ON driver_vehicles(verification_status);
```

### Phase 2: Create `vehicle_documents`
```sql
CREATE TABLE IF NOT EXISTS vehicle_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES driver_vehicles(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    rejection_reason TEXT NULL,
    verified_at TIMESTAMPTZ NULL,
    verified_by UUID NULL,
    expiry_date DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_docs_vehicle_id ON vehicle_documents(vehicle_id);
```

### Phase 3: Create `driver_service_profiles`
```sql
CREATE TABLE IF NOT EXISTS driver_service_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('MOTO', 'TAXI')),
    active_vehicle_id UUID NULL REFERENCES driver_vehicles(id) ON DELETE SET NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    eligibility_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (eligibility_status IN ('PENDING', 'ELIGIBLE', 'INELIGIBLE', 'SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_driver_service UNIQUE (driver_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_driver_service_driver_id ON driver_service_profiles(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_service_online ON driver_service_profiles(service_type, is_online, eligibility_status);
```

### Phase 4: Create `driver_active_assignments` (Global Active Ride Lock - P0)
```sql
CREATE TABLE IF NOT EXISTS driver_active_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL UNIQUE REFERENCES drivers(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
    service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('MOTO', 'TAXI')),
    vehicle_id UUID NOT NULL REFERENCES driver_vehicles(id),
    state VARCHAR(30) NOT NULL DEFAULT 'ACCEPTED'
        CHECK (state IN ('ACCEPTED', 'ARRIVED', 'IN_PROGRESS')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_active_assignments_driver ON driver_active_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_active_assignments_trip ON driver_active_assignments(trip_id);
```

### Phase 5: Extend `trips` Table
```sql
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS service_type VARCHAR(20) NOT NULL DEFAULT 'MOTO';

ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS vehicle_id UUID NULL REFERENCES driver_vehicles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trips_service_status ON trips(service_type, status);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON trips(vehicle_id);
```

---

## 3. Legacy Data Backfill Plan (Gate 2.4 Specification)

1. **Backfill Existing Motorcycle Drivers:**
   For each record in `drivers` where `plate IS NOT NULL`:
   * Insert into `driver_vehicles`:
     * `driver_id` = `drivers.id`
     * `category` = `'MOTORCYCLE'`
     * `plate` = `drivers.plate`
     * `province` = `'กรุงเทพมหานคร'` (default if unassigned)
     * `brand` = `'Existing Motorcycle'`
     * `model` = `'Standard'`
     * `color` = `'Unknown'`
     * `passenger_capacity` = 1
     * `verification_status` = `'LEGACY_REVIEW'` (Mandatory: never mark as VERIFIED without physical proof audit)
   * Insert into `driver_service_profiles`:
     * `driver_id` = `drivers.id`
     * `service_type` = `'MOTO'`
     * `active_vehicle_id` = newly created `driver_vehicles.id`
     * `is_enabled` = `TRUE`
     * `is_online` = `drivers.is_available`
     * `eligibility_status` = `'ELIGIBLE'` (MOTO drivers with verified identity continue operating)

2. **Idempotence Guard:**
   The backfill query checks `WHERE NOT EXISTS (SELECT 1 FROM driver_vehicles dv WHERE dv.driver_id = d.id)` so re-running the migration never duplicates rows.

---

## 4. Rollback Plan

If an unexpected condition occurs during testing:
1. Since changes are purely additive, existing code ignoring new columns continues running without errors.
2. Emergency rollback script:
```sql
-- Step 1: Drop foreign key reference from trips
ALTER TABLE trips DROP COLUMN IF EXISTS vehicle_id;
ALTER TABLE trips DROP COLUMN IF EXISTS service_type;

-- Step 2: Drop new tables in reverse dependency order
DROP TABLE IF EXISTS driver_active_assignments;
DROP TABLE IF EXISTS driver_service_profiles;
DROP TABLE IF EXISTS vehicle_documents;
DROP TABLE IF EXISTS driver_vehicles;
```
3. Existing tables (`drivers`, `passengers`, `trips`, `wallet`, `stations`) remain 100% unharmed.

---

## 5. Verification Checkpoints

- [x] Gate 2.1 Pre-Implementation Audit completed with zero blocking findings.
- [x] Gate 2.2 Backup and pre-migration snapshots created.
- [ ] Gate 2.3 TypeORM entities & additive schema applied.
- [ ] Gate 2.4 Legacy MOTO backfill executed and validated.
- [ ] Gate 2.5 Global Active Ride Lock implemented with atomic PostgreSQL transaction.
