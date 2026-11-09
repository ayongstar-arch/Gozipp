# GOZIPP Dual Mobility Impact Assessment
**Document ID:** GOZIPP-AUDIT-09  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** STAGE 0 — Impact Analysis & Compatibility Assessment  
**Status:** COMPLETE & VERIFIED AGAINST SOURCE CODE  
**Audit Date:** 2026-11-08  

---

## 1. Scope & Architectural Boundaries

Dual Mobility introduces **GOZIPP TAXI** alongside the operational **GOZIPP MOTO** under a **Shared Core + Independent Service Domains** pattern:

```
                           ┌───────────────────────────────────────────────┐
                           │                  SHARED CORE                  │
                           │  - Driver Identity & KYC      - Passenger Auth│
                           │  - JWT & HttpOnly Cookies     - Points Wallet │
                           │  - Double-entry Ledger        - Socket.IO Hub │
                           │  - Leaflet GPS Engine         - Audit Trail   │
                           │  - GLOBAL ACTIVE RIDE LOCK                    │
                           └───────────────────────┬───────────────────────┘
                                                   │
                   ┌───────────────────────────────┴───────────────────────────────┐
                   ▼                                                               ▼
        ┌─────────────────────────────┐                         ┌─────────────────────────────┐
        │      MOTO SERVICE DOMAIN    │                         │      TAXI SERVICE DOMAIN    │
        │  - Motorcycle Vehicles      │                         │  - Car Vehicles (Public/Pri)│
        │  - Win Stations & Geofences │                         │  - Roaming Radius Matching  │
        │  - Fair Queue Engine (Lua)  │                         │  - Distance Tiered Pricing  │
        │  - Bike Iconography         │                         │  - Car Sedan Iconography    │
        └─────────────────────────────┘                         └─────────────────────────────┘
```

---

## 2. Component-by-Component Impact Matrix

| Subsystem | Existing Component | Proposed Change | Change Type | Risk Level | Backward Compatibility |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Database Schema** | `trips` table | Add `service_type VARCHAR(20) DEFAULT 'MOTO'`, `vehicle_id UUID` | Extension | Low | 100% Compatible (Defaults to MOTO). |
| **Database Schema** | `drivers` table | Retain existing columns for MOTO back-compat; add `driver_vehicles` table for multi-vehicle | New Table | Low | 100% Compatible. |
| **Database Schema** | `driver_service_profiles` | Track independent availability (`MOTO`, `TAXI`) per driver | New Table | Low | 100% Compatible. |
| **Backend API** | `dtos.ts` (`RideRequestDto`) | Add optional `serviceType?: 'MOTO' \| 'TAXI'` | Extension | Low | 100% Compatible (Omitted = MOTO). |
| **Backend API** | `passenger.service.ts` | Pass `serviceType` to `trips` table and dispatch router | Extension | Medium | 100% Compatible. |
| **Backend API** | `fair-queue.service.ts` | Retain 100% for MOTO; isolate from TAXI | No Change | Zero | 100% Preserved. |
| **Backend API** | `TaxiMatchingService` | New service for geospatial radius matching (3–5 km) | New Service | Medium | Isolated. |
| **Backend Gateway** | `app.gateway.ts` | Route dispatch to `FairQueueService` (MOTO) or `TaxiMatchingService` (TAXI) | Extension | Medium | Validated via unit tests. |
| **Concurrency** | `driver.service.ts` (`acceptTrip`) | Enforce Global Active Ride Lock across MOTO and TAXI | Extension | High | Prevents multi-service double booking. |
| **Passenger UI** | `HomeView.tsx` | Add Top-level Service Selection Tab (`[MOTO] [TAXI]`) | Extension | Medium | Defaults to MOTO. |
| **Passenger UI** | `TrackingView.tsx` | Render car brand/model/color when `serviceType === 'TAXI'` | Extension | Low | Additive. |
| **Driver App** | `DriverApp.tsx` | Add Vehicle Picker & Service Availability Toggles (`[x] MOTO [x] TAXI`) | Extension | High | Retains single-service workflow. |
| **Admin Portal** | `AdminShell.tsx` & Pages | Add Taxi Verification Queue & Vehicle Approval Actions | Extension | Low | Dedicated sub-view. |

---

## 3. Exact Files and Database Entities Affected

### 3.1 Existing Database Entities
1. [`packages/api/entities/trip.entity.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/entities/trip.entity.ts): Add `@Column({ default: 'MOTO' }) service_type: string;` and `@Column({ nullable: true }) vehicle_id: string;`.
2. [`packages/api/entities/driver.entity.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/entities/driver.entity.ts): Add one-to-many relationship with `DriverVehicleEntity` and `DriverServiceProfileEntity`.
3. [`packages/api/database/database-migration.service.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/database/database-migration.service.ts): Add idempotent migration queries for `driver_vehicles`, `driver_service_profiles`, and columns on `trips`.

### 3.2 New Database Entities to be Created
1. `packages/api/entities/driver-vehicle.entity.ts`:
   * Fields: `id`, `driverId`, `plate`, `vehicleClassification`, `make`, `model`, `color`, `manufacturingYear`, `verificationStatus`, `verifiedAt`, `verifiedBy`.
2. `packages/api/entities/driver-service-profile.entity.ts`:
   * Fields: `id`, `driverId`, `serviceType`, `activeVehicleId`, `isEnabled`, `currentStatus`.

### 3.3 Backend API Files
1. [`packages/api/dtos.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/dtos.ts): Add `RegisterVehicleDto`, `ToggleServiceDto`, extend `RideRequestDto`.
2. [`packages/api/driver.controller.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/driver.controller.ts): Add endpoints for vehicle management and service availability toggles.
3. [`packages/api/driver.service.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/driver.service.ts): Add `registerVehicle()`, `toggleService()`, enforce Global Active Ride Lock in `acceptTrip()`.
4. [`packages/api/passenger.service.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/passenger.service.ts): Support `serviceType` in `requestRide()` and `getRideStatus()`.
5. [`packages/api/app.gateway.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/app.gateway.ts): Route `offerTripToNextDriver()` based on `trip.service_type`.
6. `packages/api/taxi-matching.service.ts` (New): Proximity radius search for car taxis.
7. [`packages/api/admin.controller.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/admin.controller.ts): Add vehicle verification review endpoints.

### 3.4 Frontend Applications
1. [`apps/web-passenger/src/features/booking/HomeView.tsx`](file:///c:/Users/acer/Videos/Project/Gozipp/apps/web-passenger/src/features/booking/HomeView.tsx): Add Dual Mobility tab selector.
2. [`apps/web-passenger/src/hooks/useRide.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/apps/web-passenger/src/hooks/useRide.ts): Pass `serviceType` in request payload.
3. [`apps/mobile-driver/src/components/DriverApp.tsx`](file:///c:/Users/acer/Videos/Project/Gozipp/apps/mobile-driver/src/components/DriverApp.tsx): Add vehicle profile modal and dual service switches (`MOTO` / `TAXI`).
4. [`apps/web-admin/src/components/admin/Sidebar.tsx`](file:///c:/Users/acer/Videos/Project/Gozipp/apps/web-admin/src/components/admin/Sidebar.tsx): Add "การอนุมัติรถแท็กซี่ (Taxi Verifications)" navigation item.

---

## 4. Potential Breaking Changes & Safeguards

| Potential Breaking Change | Risk Description | Architectural Safeguard |
| :--- | :--- | :--- |
| **Missing `service_type` in legacy requests** | Existing mobile clients or cached web clients might submit `POST /passenger/ride/request` without `serviceType`. | Backend DTO assigns `'MOTO'` as default when `serviceType` is undefined. |
| **Driver vehicle schema migration** | Existing motorcycle drivers have their plate stored in `drivers.plate`. | Database migration backfills existing driver plates into `driver_vehicles` as verified `MOTORCYCLE` entries. |
| **Cross-service queue interference** | Car taxis entering motorcycle Win queues or vice versa. | `FairQueueService` strictly asserts `vehicleClassification === 'MOTORCYCLE'`. |
| **Race condition on dual accept** | A driver offered both MOTO and TAXI clicks accept on both within milliseconds. | Redis `SET driver:${driverId}:active_ride ... NX` ensures only one acceptance succeeds; the other is rejected with HTTP 400. |
