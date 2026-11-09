# GOZIPP Dual Mobility Risk Register
**Document ID:** GOZIPP-AUDIT-10  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** STAGE 0 — Risk Assessment & Mitigation Register  
**Status:** COMPLETE & VERIFIED AGAINST SOURCE CODE  
**Audit Date:** 2026-11-08  

---

## 1. Risk Matrix Overview

| Risk ID | Category | Severity | Likelihood | Impact Area | Mitigation Summary |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **RSK-CONC-01** | Concurrency | **CRITICAL** | High | Multi-service double booking | Atomic Global Active Ride Lock (Redis `SET NX` + PostgreSQL `FOR UPDATE`) |
| **RSK-LEGL-01** | Regulatory | **CRITICAL** | High | DLT Legal Compliance & Certification | Strict vehicle classification (`PUBLIC_TAXI` vs `PRIVATE_CAR_FOR_HIRE`) & mandatory verification gate |
| **RSK-DATA-01** | Database | **HIGH** | Medium | Backward compatibility for MOTO | Idempotent migration with default `'MOTO'` and automatic legacy plate backfill |
| **RSK-DISP-01** | Dispatch | **HIGH** | High | Queue pollution (Car in Bike Win) | Total separation of Win Sorted Sets and Taxi Geospatial radius pools |
| **RSK-PERF-01** | Performance | **MEDIUM** | Medium | Redis GeoSet load under high concurrency | Redis GeoSearch with clamped 3.0 km search radius and candidate limits (max 20) |
| **RSK-UX-01** | Usability | **MEDIUM** | Low | Driver confusion with dual modes | Explicit vehicle switch UI and single-touch service toggle with audible feedback |
| **RSK-FIN-01** | Financial | **LOW** | Low | Zero GP / Fare Discrepancy | Retain 0% driver commission and flat system fee deduct model across all modes |

---

## 2. In-Depth Risk Analysis & Mitigation Specifications

### 2.1 RSK-CONC-01: Multi-Service Double Booking & Race Conditions
* **Description:** A driver enables both MOTO and TAXI. Two ride requests (one motorcycle and one taxi) are dispatched to the driver simultaneously. The driver taps "Accept" on both within milliseconds, creating two overlapping active trips.
* **Failure Mode:** Passenger is stranded; driver location telemetry alternates between two trips; state machine deadlocks.
* **Mitigation Specification:**
  1. The server enforces a centralized **Global Active Ride Lock** inside `acceptTrip()` ([`driver.service.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/driver.service.ts)):
     ```typescript
     // Layer 1: Atomic Redis Lock
     const acquiredGlobalLock = await this.redis.set(
       `driver:${dto.driverId}:active_ride`,
       dto.tripId,
       'EX', 10800,
       'NX'
     );
     if (!acquiredGlobalLock) {
       throw new BadRequestException('ท่านมีงานที่กำลังดำเนินการอยู่แล้ว ไม่สามารถรับงานซ้อนได้');
     }
     ```
  2. Database-level validation inside the SQL transaction:
     ```sql
     SELECT id FROM trips 
     WHERE driver_id = $1 AND status IN ('ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS') 
     FOR UPDATE;
     ```
* **Contingency / Rollback:** If lock acquisition fails, the transaction rolls back, and passenger points are immediately refunded via `creditService.refundForRide()`.

---

### 2.2 RSK-LEGL-01: Thailand DLT & ETDA Regulatory Non-Compliance
* **Description:** Department of Land Transport (DLT) regulations strictly differentiate between:
  * Public Motorcycle Taxis (ป้ายเหลือง + เสื้อวิน + สังกัดวินที่ถูกต้อง)
  * Public Metered Taxis (ป้ายเหลือง + ใบขับขี่สาธารณะ)
  * Ride-Hailing Private Cars for Hire (รถยนต์รับจ้างผ่านระบบอิเล็กทรอนิกส์ ตามประกาศ กกพ. / ขบ.)
* **Failure Mode:** Dispatching an unverified private car or a motorcycle driver on a taxi job leads to regulatory penalties, platform suspension, or police seizure.
* **Mitigation Specification:**
  1. Mandatory verification gate: No vehicle may receive jobs without `verification_status === 'VERIFIED'`.
  2. Mandatory document requirements per vehicle category:
     * `PUBLIC_TAXI`: Public Driving License (ใบขับขี่สาธารณะ), Yellow Plate registration, Commercial Taxi meter/GPS certificate.
     * `PRIVATE_CAR_FOR_HIRE`: Private Hire Vehicle sticker (สติกเกอร์ ขบ.), compulsory insurance for ride-hailing (พ.ร.บ. คุ้มครองผู้โดยสาร), criminal record clearance.
  3. Verification decisions must be approved by an administrator and recorded in `audit_logs`.

---

### 2.3 RSK-DATA-01: Legacy Motorcycle Driver Schema Corruption
* **Description:** Applying database schema migrations to introduce `driver_vehicles` could break existing legacy motorcycle driver accounts if `drivers.plate` is removed or modified destructively.
* **Mitigation Specification:**
  1. **Strict Non-Destructive DDL Rule:** Do NOT drop or alter existing columns on `drivers` or `trips`.
  2. All new columns (`service_type`, `vehicle_id`) must have backward-compatible defaults (`DEFAULT 'MOTO'`).
  3. Automatic Data Backfill script copies existing `drivers.plate` values into `driver_vehicles` as verified `MOTORCYCLE` entries upon migration execution.

---

### 2.4 RSK-DISP-01: Queue Pollution & Dispatch Degradation
* **Description:** A taxi driver entering a geographic area near a Win station could inadvertently get queued into `win:${winId}:queue`, causing the system to dispatch a car down narrow pedestrian alleyways.
* **Mitigation Specification:**
  1. `FairQueueService.joinQueue()` is restricted strictly to vehicles where `vehicleClassification === 'MOTORCYCLE'`.
  2. The dispatch router routes `service_type === 'MOTO'` to `FairQueueService` and `service_type === 'TAXI'` to `TaxiMatchingService`.
  3. Zero cross-contamination between Sorted Sets (`win:queue`) and GeoSets (`taxi:locations`).

---

### 2.5 RSK-UX-01: Driver Cognitive Overload & Distraction
* **Description:** Presenting complex multi-vehicle configuration toggles to drivers while driving outdoors in bright sunlight leads to errors.
* **Mitigation Specification:**
  1. High-contrast, large-touch-target UI adhering to WCAG 2.2 AA.
  2. Service toggles (`MOTO` / `TAXI`) can only be modified while the driver is `OFFLINE` or `IDLE` (disabled during active rides).
  3. Distinct audio chime notifications for MOTO requests vs. TAXI requests.
