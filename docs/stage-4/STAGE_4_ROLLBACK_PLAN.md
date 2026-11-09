# GOZIPP DUAL MOBILITY PLATFORM — STAGE 4
## Gate B: Safe Rollback Plan & Forward-Fix Recovery Strategy

**Document ID:** GOZIPP-STAGE-4-ROLLBACK-PLAN  
**Version:** 1.0  
**Status:** PLAN CERTIFIED  
**Site Reliability Engineer:** Antigravity AI Engineering Engine  
**Target Environment:** Development / Staging Isolation  
**Date:** 2026-11-08  

---

## 1. Executive Summary

This document specifies the rollback procedures, failure mitigation playbooks, and forward-fix protocols for **Stage 4: Passenger Booking & Driver Operational Experience**.

In compliance with the **Mandatory Corrections** established in Stage 1 and Stage 2:
- `DROP TABLE` is **STRICTLY PROHIBITED** as a default rollback mechanism.
- The platform adopts an **Expand-and-Contract / Forward-Fix** operational model.
- Customer trip history and MOTO operational data are protected against data loss under all failure scenarios.

---

## 2. Failure Scenarios & Mitigation Playbooks

### 2.1 Scenario 1: Outbox Worker Bottleneck or Message Broker Unavailability
- **Symptoms:** `outbox_events` table grows rapidly; events remain in `PENDING` status; passengers experience delay receiving driver offers.
- **Immediate Mitigation (Zero Downtime):**
  1. Toggle fallback direct-dispatch mode: If Outbox processor fails, `passenger.service.ts` can dynamically fallback to direct Redis publish while logging a telemetry warning.
  2. Increase Outbox Worker concurrency: Adjust batch limit from 50 to 200 rows with `SKIP LOCKED`.
- **Forward-Fix:** Resolve Redis network latency or restart Redis cluster. Once connectivity resumes, the worker will automatically drain all queued `PENDING` outbox events with zero event loss.

---

### 2.2 Scenario 2: TAXI Dispatch Anomaly in Staging
- **Symptoms:** Unexpected dispatch error, candidate ranking calculation failure, or improper socket broadcast for TAXI rides.
- **Immediate Mitigation (Instant Feature Flag Deactivation):**
  1. Update environment or configuration:
     ```bash
     TAXI_MATCHING_ENABLED=false
     TAXI_DISPATCH_ENABLED=false
     TAXI_PUBLIC_BOOKING_ENABLED=false
     ```
  2. The `AppGateway` Service Type Router immediately diverts all incoming requests to reject TAXI bookings with an informative message.
  3. **Zero Impact on MOTO:** MOTO dispatch via `FairQueueService` continues operating completely unhindered.

---

### 2.3 Scenario 3: Database Schema Migration Glitch
- **Symptoms:** Additive column creation encounters lock timeout or table access conflict during migration.
- **Safe Rollback Protocol:**
  1. All Stage 4 migrations are strictly additive:
     - `CREATE TABLE IF NOT EXISTS outbox_events ...`
     - `ALTER TABLE trips ADD COLUMN IF NOT EXISTS ...`
  2. If a migration is interrupted, the database remains in a consistent state.
  3. No rollback script is required to drop tables or columns; the application code can safely function whether the new columns exist or not via TypeORM entity optionality.
  4. If explicit reversion of additive columns is mandated by operations:
     ```sql
     -- Safe Non-Destructive Column Inactivation:
     ALTER TABLE trips DROP COLUMN IF EXISTS arrival_verified;
     ALTER TABLE trips DROP COLUMN IF EXISTS arrival_gps_accuracy;
     ALTER TABLE trips DROP COLUMN IF EXISTS arrival_distance_meters;
     ALTER TABLE trips DROP COLUMN IF EXISTS arrival_verification_status;
     ALTER TABLE trips DROP COLUMN IF EXISTS idempotency_key;
     -- NOTE: outbox_events table should be archived, NOT dropped.
     ```

---

## 3. Production Recovery & Data Preservation Procedures

1. **Pre-Deployment Backup Verification:** Prior to any staging cutover, verify snapshot existence:
   ```bash
   pg_dump -Fc gozipp_db > backup_stage4_pre_migration.dump
   ```
2. **Point-in-Time Recovery (PITR):** Enable WAL archiving to ensure recovery to any transaction timestamp.
3. **Data Integrity Check:** Following any incident, execute data reconciliation script to confirm that all completed trips have matching point ledger entries and zero orphaned records in `driver_active_assignments`.
