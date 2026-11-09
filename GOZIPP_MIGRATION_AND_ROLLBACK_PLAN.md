# GOZIPP Safe Migration & Zero-Loss Rollback Plan
**Document ID:** GOZIPP-MIG-01  
**Project:** GOZIPP Dual Mobility Platform (MOTO + TAXI)  
**Stage:** STAGE 1 — Technical Contract Design  
**Status:** DRAFTED FOR APPROVAL  
**Pattern:** Expand-and-Contract / Forward-Fix (No Destructive Table Drops)  
**Date:** 2026-11-08  

---

## 1. Migration Philosophy & Mandatory Rules (Mandatory Correction B)

1. **NEVER USE `DROP TABLE` AS DEFAULT ROLLBACK:**
   * Destructive table drops (`DROP TABLE CASCADE`) discard legitimate operational records (customer trips, earnings, ledger entries, security logs) created while the feature was active.
   * Rollback must preserve 100% of operational data.
2. **Expand-and-Contract Pattern:**
   * Schema changes are deployed in non-breaking phases:
     * **Expand:** Add new tables and nullable/default columns alongside existing structures.
     * **Backfill & Dual-Read:** Populate new entities while maintaining legacy columns.
     * **Contract:** Deprecate legacy columns only after multiple weeks of proven production stability.
3. **Forward-Fix First:**
   * If a defect is discovered in TAXI dispatch or matching, the incident is resolved by **disabling the feature flag** or hotfixing forward, not by reverting the database schema.

---

## 2. Pre-Migration Backup & Verification Procedure

Before any migration DDL is executed on staging or production:

### 2.1 Complete Database Snapshot
```bash
# Execute full logical PostgreSQL backup with compression and metadata
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  -F c -b -v -f "gozipp_pre_dual_mobility_$(date +%Y%m%d_%H%M%S).dump"

# Verification: Test restore on an isolated scratch database
createdb -h localhost -U postgres gozipp_backup_verify
pg_restore -h localhost -U postgres -d gozipp_backup_verify \
  --schema-only "gozipp_pre_dual_mobility_*.dump"
dropdb -h localhost -U postgres gozipp_backup_verify
```

### 2.2 Migration Versioning Tracker
A new migration ledger table tracks executed migration scripts:
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version       VARCHAR(50) PRIMARY KEY,
  description   VARCHAR(255) NOT NULL,
  checksum      VARCHAR(64) NOT NULL,
  applied_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_ms  INTEGER NOT NULL
);
```

---

## 3. Four-Phase Expand-and-Contract Migration Execution

```mermaid
flowchart LR
    subgraph Phase 1: Expand
        ColTrips[ALTER trips ADD service_type, vehicle_id]
        TblVeh[CREATE TABLE driver_vehicles]
        TblProf[CREATE TABLE driver_service_profiles]
        TblLock[CREATE TABLE driver_active_assignments]
        TblDoc[CREATE TABLE vehicle_documents]
    end

    subgraph Phase 2: Backfill
        MigrateMoto[Backfill existing drivers to driver_vehicles with LEGACY_REVIEW]
        MigrateProf[Create default MOTO service profiles]
    end

    subgraph Phase 3: Dual-Run
        DualRun[System operates both MOTO and TAXI without breaking legacy columns]
    end

    subgraph Phase 4: Contract (Deferred)
        Contract[Deprecate drivers.plate after verified stability]
    end

    Phase 1 --> Phase 2 --> Phase 3 --> Phase 4
```

### Phase 1: Expand (Zero-Downtime Schema Extension)
* Execute DDL creating `driver_vehicles`, `driver_service_profiles`, `driver_active_assignments`, `vehicle_documents`.
* Add `service_type` (`DEFAULT 'MOTO'`) and `vehicle_id` (`NULLABLE`) to `trips`.
* **Impact:** 100% non-breaking. Existing queries on `trips` and `drivers` continue running unmodified.

### Phase 2: Idempotent Data Backfill
* Migrates existing motorcycle drivers into `driver_vehicles` with `verification_status = 'LEGACY_REVIEW'`:
```sql
INSERT INTO driver_vehicles (driver_id, plate, vehicle_classification, verification_status, verified_at)
SELECT id, plate, 'MOTORCYCLE', 'LEGACY_REVIEW', NOW()
FROM drivers
WHERE plate IS NOT NULL AND plate != ''
ON CONFLICT (plate) DO NOTHING;

INSERT INTO driver_service_profiles (driver_id, service_type, active_vehicle_id, is_enabled, availability_status)
SELECT d.id, 'MOTO', v.id, 
       CASE WHEN d.approval_status = 'APPROVED' THEN TRUE ELSE FALSE END,
       CASE WHEN d.current_status = 'IDLE' THEN 'ONLINE_IDLE' ELSE 'OFFLINE' END
FROM drivers d
JOIN driver_vehicles v ON v.driver_id = d.id AND v.vehicle_classification = 'MOTORCYCLE'
ON CONFLICT (driver_id, service_type) DO NOTHING;
```

### Phase 3: Dual-Run & Feature Flag Enablement
* The application runs in Dual Mobility mode.
* If `FEATURE_TAXI_ENABLED !== 'true'`, the passenger UI hides the Taxi tab, and the backend dispatch router accepts only `MOTO` requests.

### Phase 4: Contract (Scheduled 60 Days Post-Cutover)
* Legacy columns `drivers.plate` and `drivers.station_id` are preserved for backward compatibility and archived only after comprehensive audit sign-off.

---

## 4. Production Forward-Fix & Emergency Deactivation (No Data Loss)

If a critical bug is detected in the TAXI service after deployment:

### Level 1: Soft Feature Flag Deactivation (Zero Downtime)
* In Redis: `SET config:feature:taxi_enabled false`
* **Result:**
  * Passenger UI automatically hides the TAXI tab via reactive polling/websocket.
  * Driver App disables the TAXI toggle switch.
  * In-progress TAXI rides complete normally.
  * MOTO service continues operating at 100% capacity with zero disruption.
  * **Operational Data Lost: 0%.**

### Level 2: Service Profile Freezing
* If a data anomaly is isolated to taxi matching:
```sql
UPDATE driver_service_profiles 
SET is_enabled = FALSE, availability_status = 'OFFLINE' 
WHERE service_type = 'TAXI';
```
* Prevents any taxi driver from receiving dispatch offers while engineering deploys a forward hotfix.

---

## 5. Rollback Limitations & Emergency Disaster Recovery

### When is a DDL Reversion Permitted?
* Schema reversion is permitted **ONLY** within the deployment maintenance window if the migration script fails *before* user traffic is directed to the new version.

### Safe DDL Reversion Script (If Aborted Prior to Cutover)
```sql
-- Safe reversion if deployment is aborted before traffic:
DELETE FROM driver_service_profiles WHERE service_type = 'TAXI';
DELETE FROM driver_vehicles WHERE vehicle_classification != 'MOTORCYCLE';
ALTER TABLE trips DROP COLUMN IF EXISTS service_type;
ALTER TABLE trips DROP COLUMN IF EXISTS vehicle_id;
DROP TABLE IF EXISTS driver_active_assignments;
DROP TABLE IF EXISTS vehicle_documents;
DROP TABLE IF EXISTS driver_service_profiles;
DROP TABLE IF EXISTS driver_vehicles;
```

### Disaster Recovery: Point-in-Time Recovery (PITR)
* If database corruption occurs:
  1. Freeze incoming API mutations: Set NGINX / Gateway maintenance mode.
  2. Restore base snapshot from `gozipp_pre_dual_mobility_*.dump`.
  3. Replay PostgreSQL WAL logs up to the exact transaction timestamp prior to the incident.
  4. Verify data consistency via `npx ts-node scripts/verify-db-integrity.ts`.
  5. Unfreeze traffic.
