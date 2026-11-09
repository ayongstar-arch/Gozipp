# GOZIPP Dual Mobility Implementation Roadmap
**Document ID:** GOZIPP-AUDIT-11  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** STAGE 0 — Post-Approval Implementation Roadmap (Stages 1–11)  
**Status:** DRAFTED & READY FOR USER APPROVAL  
**Audit Date:** 2026-11-08  

---

## 1. Roadmap Architecture & Execution Sequence

Implementation proceeds in strictly gated sequential stages:

```
[STAGE 0] Complete Audit (CURRENT - COMPLETE)
   │
   ▼ (Requires Explicit User Approval)
[STAGE 1] Architecture Finalization & DTO Formalization
   │
   ▼
[STAGE 2] Database Schema & Idempotent Migration Foundation
   │
   ▼
[STAGE 3] Driver Multi-Vehicle Registration & Management
   │
   ▼
[STAGE 4] Driver Multi-Service Availability (MOTO & TAXI Online Toggles)
   │
   ▼
[STAGE 5] Passenger Taxi Selection & Ride Request Extension
   │
   ▼
[STAGE 6] Independent Taxi Matching & Geospatial Radius Dispatch
   │
   ▼
[STAGE 7] Global Active Ride Lock & Concurrency Defense
   │
   ▼
[STAGE 8] Admin Verification Portal & DLT Legal Compliance
   │
   ▼
[STAGE 9] Automated Regression, Concurrency & Security Testing
   │
   ▼
[STAGE 10] Staging Deployment & Multi-Device Smoke Test
   │
   ▼
[STAGE 11] Production Certification & Controlled Cutover
```

---

## 2. Detailed Stage-by-Stage Implementation Specifications

### STAGE 1 — Architecture Finalization & Contract Specification
* **Objective:** Finalize TypeORM entity interfaces, REST API contracts, and WebSocket event payloads.
* **Key Deliverables:**
  * Define `driver-vehicle.entity.ts`, `driver-service-profile.entity.ts`.
  * Extend `packages/api/dtos.ts` with `RegisterVehicleDto`, `UpdateVehicleDto`, `ToggleServiceDto`, and updated `RideRequestDto`.
* **Exit Gate:** All DTOs compile cleanly with zero TypeScript errors across monorepo (`npx tsc -b --noEmit`).

---

### STAGE 2 — Database Schema & Migration Foundation
* **Objective:** Deploy non-destructive database migrations.
* **Key Deliverables:**
  * Update [`DatabaseMigrationService`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/database/database-migration.service.ts) to create `driver_vehicles` and `driver_service_profiles` tables idempotently.
  * Add `service_type` (`DEFAULT 'MOTO'`) and `vehicle_id` to `trips` table.
  * Execute automatic backfill of existing motorcycle drivers into `driver_vehicles`.
* **Automated Tests:** Verify migration idempotency (running migration twice produces identical schema without error).
* **Rollback Plan:** `DROP TABLE driver_service_profiles, driver_vehicles; ALTER TABLE trips DROP COLUMN service_type;`.

---

### STAGE 3 — Driver Multi-Vehicle Management
* **Objective:** Allow a driver to register, view, and manage multiple vehicles (Motorcycle + Car Taxi).
* **Key Deliverables:**
  * Implement `GET /api/v1/driver/vehicles` and `POST /api/v1/driver/vehicles`.
  * Add vehicle document upload endpoint: `POST /api/v1/driver/vehicles/:id/documents`.
  * Build vehicle management drawer in `DriverApp.tsx`.
* **Exit Gate:** A driver can add a Car Taxi without affecting their existing Motorcycle status.

---

### STAGE 4 — Driver Multi-Service Availability
* **Objective:** Enable independent availability toggles for MOTO and TAXI.
* **Key Deliverables:**
  * Implement `PATCH /api/v1/driver/services/:serviceType/toggle`.
  * Update `DRIVER_UPDATE_STATUS` socket handler to handle service-specific online states.
  * Add dual-toggle UI switch in `DriverApp.tsx` (`[x] วินมอเตอร์ไซค์`, `[x] รถแท็กซี่`).
* **Exit Gate:** Driver can be online for MOTO only, TAXI only, or both simultaneously.

---

### STAGE 5 — Passenger Taxi Selection & Booking
* **Objective:** Enable passengers to choose between MOTO and TAXI on the booking interface.
* **Key Deliverables:**
  * Add top-level Service Selector Pill on [`HomeView.tsx`](file:///c:/Users/acer/Videos/Project/Gozipp/apps/web-passenger/src/features/booking/HomeView.tsx).
  * Update `useRide.ts` to pass `serviceType` to `POST /api/v1/passenger/ride/request`.
  * Display car-specific estimate and vehicle details on `TrackingView.tsx`.
* **Exit Gate:** Passenger can book a Car Taxi; booking creates a trip with `service_type = 'TAXI'`.

---

### STAGE 6 — Independent Taxi Matching & Geospatial Dispatch
* **Objective:** Implement the car taxi radius-matching engine without touching motorcycle Win queues.
* **Key Deliverables:**
  * Build `TaxiMatchingService` using Redis `GEOSEARCH` (3.0 km radius).
  * Update `AppGateway.offerTripToNextDriver()` to route `TAXI` trips to `TaxiMatchingService` and `MOTO` trips to `FairQueueService`.
* **Automated Tests:** Unit test asserting that motorcycle queues never receive car taxi requests and vice versa.

---

### STAGE 7 — Global Active Ride Lock Integration
* **Objective:** Guarantee that a driver can have only ONE active ride across all service types.
* **Key Deliverables:**
  * Implement atomic Redis lock `driver:${driverId}:active_ride` in `acceptTrip()`.
  * Add database-level transaction row locking (`FOR UPDATE`).
  * Release lock on `completeTrip()` and `cancelRide()`.
* **Automated Tests:** Concurrency race test simulating simultaneous MOTO and TAXI acceptance attempts; asserts exactly one succeeds and one is rejected.

---

### STAGE 8 — Admin Verification & DLT Legal Compliance
* **Objective:** Provide back-office auditing tools for vehicle verification.
* **Key Deliverables:**
  * Add Taxi verification review tab in `web-admin`.
  * Build `POST /api/v1/admin/vehicles/:id/verify` with approval/rejection notes.
  * Record all verification decisions in `audit_logs`.
  * Update live fleet God-view map with vehicle type markers (Bike vs. Car).
* **Exit Gate:** Unverified vehicles are strictly barred from receiving passenger dispatches.

---

### STAGE 9 — Security, Regression & Performance Testing
* **Objective:** Comprehensive testing of the integrated system.
* **Test Suites:**
  1. Regression Test: Existing MOTO booking and Win queue operate with 100% fidelity.
  2. Concurrency Test: 50 concurrent requests against dual-online drivers.
  3. Security Test: Unauthorized role mutations and token replay validation.
  4. Build Test: Clean monorepo build `turbo run build` and `npx tsc -b --noEmit`.

---

### STAGE 10 — Staging Deployment
* **Objective:** Deploy to Render staging environment (`gozipp-api-staging`).
* **Deliverables:**
  * Run database migration on staging database.
  * Verify staging smoke tests across mobile passenger, driver, and admin portals.

---

### STAGE 11 — Production Certification & Controlled Cutover
* **Objective:** Production rollout with zero downtime.
* **Deliverables:**
  * Execute database backup (`npm run db:backup`).
  * Apply non-destructive migration.
  * Enable Dual Mobility feature flag.
  * Monitor real-time logs via `AuditLogViewer`.
