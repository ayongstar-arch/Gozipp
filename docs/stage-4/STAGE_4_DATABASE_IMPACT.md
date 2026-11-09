# GOZIPP DUAL MOBILITY PLATFORM — STAGE 4
## Gate B: Database Schema Impact & Additive DDL Specification

**Document ID:** GOZIPP-STAGE-4-DATABASE-IMPACT  
**Version:** 1.0  
**Status:** DDL SPECIFICATION CERTIFIED  
**Database Architect:** Antigravity AI Engineering Engine  
**Target Environment:** Development / Staging Isolation  
**Date:** 2026-11-08  

---

## 1. Executive Summary

This document details the exact database changes required for **Stage 4: Passenger Booking & Driver Operational Experience**.

In strict accordance with the **Non-Negotiable Business Rules** and **Section 23 (Absolute Prohibitions)**:
- **Zero Destructive Changes:** No tables, columns, constraints, or enum types are dropped or modified destructively.
- **100% Additive & Backward-Compatible:** All DDL statements utilize `IF NOT EXISTS` guards.
- **MOTO Preservation:** Existing MOTO trips, driver records, and point transactions are untouched.
- **Transactional Outbox Foundation:** Introduces `outbox_events` table to guarantee reliable dispatch event emission.
- **Driver Arrival Verification:** Extends `trips` table with verified arrival telemetry fields.

---

## 2. Table-by-Table Schema Impact Analysis

### 2.1 New Table: `outbox_events` (Transactional Outbox Pattern)

To guarantee that a ride request created in `trips` is never lost if an immediate message broker call (Redis) fails, all outbound domain events are persisted in `outbox_events` within the same ACID transaction.

#### Schema Definition (PostgreSQL DDL)
```sql
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 5,
    last_error TEXT NULL,
    correlation_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ NULL
);

-- Efficient polling index for pending events (Outbox Worker)
CREATE INDEX IF NOT EXISTS idx_outbox_events_status_created 
ON outbox_events (status, created_at) 
WHERE status = 'PENDING';

-- Audit and correlation tracking index
CREATE INDEX IF NOT EXISTS idx_outbox_events_correlation 
ON outbox_events (correlation_id);
```

#### Field Specifications
| Column Name | Type | Nullable | Description |
|---|---|---|---|
| `id` | `UUID` | No | Primary key. |
| `aggregate_type` | `VARCHAR(50)` | No | Domain entity type (`TRIP`, `DRIVER`, `PAYMENT`). |
| `aggregate_id` | `VARCHAR(100)` | No | Identifier of the aggregate root (e.g., `tripId`). |
| `event_type` | `VARCHAR(100)` | No | Event name (`RIDE_REQUESTED`, `OFFER_ACCEPTED`, `DRIVER_ARRIVED`). |
| `payload` | `JSONB` | No | Full JSON payload to be dispatched to message broker / sockets. |
| `status` | `VARCHAR(20)` | No | State machine: `PENDING` $\rightarrow$ `PUBLISHED` or `FAILED`. |
| `retry_count` | `INT` | No | Number of delivery attempts made. |
| `max_retries` | `INT` | No | Maximum permitted retries before marking `FAILED` (default 5). |
| `last_error` | `TEXT` | Yes | Error message from most recent failed publish attempt. |
| `correlation_id` | `VARCHAR(100)` | No | Trace ID linking passenger booking request to dispatch worker. |
| `created_at` | `TIMESTAMPTZ` | No | Server timestamp of event creation. |
| `published_at` | `TIMESTAMPTZ` | Yes | Server timestamp when event was acknowledged by broker. |

---

### 2.2 Table Extension: `trips` Table

To support idempotent booking, driver arrival geofence verification, and extended vehicle attribution, the following additive columns are specified:

```sql
-- 1. Idempotency Key to prevent duplicate booking submissions
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_idempotency_key 
ON trips (idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- 2. Driver Arrival Verification Telemetry
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS arrival_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS arrival_gps_accuracy FLOAT NULL;

ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS arrival_distance_meters FLOAT NULL;

ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS arrival_verification_status VARCHAR(30) NULL DEFAULT 'UNVERIFIED';
```

#### Impact on Existing Queries
- **Read Queries:** Existing queries selecting specific columns (`id`, `passenger_id`, `driver_id`, `status`, `fare`) remain completely unaffected.
- **Write Queries:** All new columns are either `NULL` or provide default values (`DEFAULT FALSE`, `DEFAULT 'UNVERIFIED'`). No existing insert statements will fail.
- **Index Overhead:** The partial unique index on `idempotency_key` only indexes non-null rows, consuming near-zero storage for historical trips.

---

### 2.3 Status Enum Compatibility

The existing `trips.status` column uses PostgreSQL enum `'SEARCHING', 'SCHEDULED', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'TIMEOUT_NO_DRIVER'`.

To avoid complex enum migrations across PostgreSQL variants in staging:
- The core database enum remains intact.
- The extended lifecycle states defined in Stage 4 (`OFFER_SENT`, `DRIVER_ASSIGNED`, `DRIVER_EN_ROUTE`) are managed in:
  1. `driver_active_assignments.state` (which already uses `VARCHAR(30)` supporting `ASSIGNED`, `EN_ROUTE`, `ARRIVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
  2. Redis fast-path status `trip:${tripId}`.
- This ensures 100% backward compatibility with all legacy reporting tools while fulfilling the Stage 4 state lifecycle requirements.

---

### 2.4 Existing Tables: Integrity Verification

| Table Name | Modification in Stage 4 | Integrity Status |
|---|---|---|
| `drivers` | None | Unaltered |
| `passengers` | None | Unaltered |
| `driver_vehicles` | None (Created in Stage 2) | Unaltered |
| `vehicle_documents` | None (Created in Stage 2) | Unaltered |
| `driver_service_profiles` | None (Created in Stage 2) | Unaltered |
| `driver_active_assignments` | None (Created in Stage 2) | Unaltered |
| `outbox_events` | **NEW TABLE** | Additive only |
| `trips` | **ADD 4 COLUMNS** | Additive only |

---

## 3. Migration Execution Plan in `DatabaseMigrationService`

The additive migration will be registered in `packages/api/database/database-migration.service.ts` as an idempotent migration step:

```typescript
// Migration Step: Stage 4 Outbox & Arrival Verification Schema
await queryRunner.query(`
  CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 5,
    last_error TEXT NULL,
    correlation_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ NULL
  );
  
  CREATE INDEX IF NOT EXISTS idx_outbox_events_status_created 
  ON outbox_events (status, created_at) 
  WHERE status = 'PENDING';

  CREATE INDEX IF NOT EXISTS idx_outbox_events_correlation 
  ON outbox_events (correlation_id);

  ALTER TABLE trips ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_idempotency_key 
  ON trips (idempotency_key) WHERE idempotency_key IS NOT NULL;

  ALTER TABLE trips ADD COLUMN IF NOT EXISTS arrival_verified BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE trips ADD COLUMN IF NOT EXISTS arrival_gps_accuracy FLOAT NULL;
  ALTER TABLE trips ADD COLUMN IF NOT EXISTS arrival_distance_meters FLOAT NULL;
  ALTER TABLE trips ADD COLUMN IF NOT EXISTS arrival_verification_status VARCHAR(30) NULL DEFAULT 'UNVERIFIED';
`);
```

---

## 4. Rollback Feasibility Analysis
In the event of a required rollback:
- Dropping `outbox_events` does not affect core trip history or passenger records.
- The 4 additive columns on `trips` can be ignored or safely removed using `ALTER TABLE trips DROP COLUMN IF EXISTS ...`.
- No customer data is destroyed, ensuring zero data risk during migration.
