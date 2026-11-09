# GOZIPP Stage 2 Global Active Ride Lock Test Report (P0)
**Document ID:** GOZIPP-STAGE-2-GLOBAL-LOCK-TEST-REPORT  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** STAGE 2 — Gate 2.5 (P0 Concurrency Requirement)  
**Test Suite:** `packages/api/test/dual-mobility-stage2.test.cjs`  
**Execution Date:** 2026-11-08  
**Result:** 100% PASS — ZERO RACE CONDITIONS PERMITTED  

---

## 1. Requirement & Architecture Principle

Under the GOZIPP Dual Mobility model:
> **"A driver may have only ONE active passenger ride at a time across all service types."**

To prevent double-booking across independent MOTO and TAXI queues, the lock is enforced at the database transaction layer via a PostgreSQL unique index on `driver_active_assignments.driver_id`, backed by an atomic fast-path key in Redis. Redis is **never** the sole source of truth for ride ownership.

```
                  ┌──────────────────────────────────────────────┐
                  │ Driver Accepts Ride (MOTO or TAXI)           │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ Check PostgreSQL driver_active_assignments   │
                  └──────────────────────┬───────────────────────┘
                                         │
                   Existing Assignment?  │
                   ┌─────────────────────┴─────────────────────┐
                   │ YES                                       │ NO
                   ▼                                           ▼
┌─────────────────────────────────────┐     ┌─────────────────────────────────────┐
│ 409 ConflictException               │     │ INSERT driver_active_assignments    │
│ "ท่านมีงานที่กำลังดำเนินการอยู่แล้ว    │     │ (driver_id UNIQUE constraint)       │
│ ไม่สามารถรับงานซ้อนได้"             │     └──────────────────┬──────────────────┘
└─────────────────────────────────────┘                        │
                                            Unique Violation?  │
                                            ┌──────────────────┴──────────────────┐
                                            │ YES (Race Condition)                │ NO
                                            ▼                                     ▼
                         ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐
                         │ 409 ConflictException               │ │ Commit Transaction & Set Redis Key  │
                         │ "ท่านมีงานที่กำลังดำเนินการอยู่แล้ว   │ │ `driver:{id}:active_assignment`     │
                         │ ไม่สามารถรับงานซ้อนได้"             │ └─────────────────────────────────────┘
                         └─────────────────────────────────────┘
```

---

## 2. Test Execution & Evidence

### Test Case 1: Sequential Concurrent Ride Block
* **Scenario:** Driver accepts MOTO ride `trip-moto-1`. While `trip-moto-1` is active, the driver attempts to accept TAXI ride `trip-taxi-2`.
* **Execution:**
  1. `acceptTrip({ driverId, tripId: 'trip-moto-1' })` $\rightarrow$ Returns `{ success: true }`.
  2. Active assignment stored in `driver_active_assignments` (`trip_id: trip-moto-1`, `state: 'ACCEPTED'`).
  3. `acceptTrip({ driverId, tripId: 'trip-taxi-2' })` $\rightarrow$ Throws `ConflictException`.
  4. Error message verified: `"ท่านมีงานที่กำลังดำเนินการอยู่แล้ว ไม่สามารถรับงานซ้อนได้"`.
  5. `trip-taxi-2` remains in `SEARCHING` state; not stolen or corrupted.
  6. `completeTrip({ driverId, tripId: 'trip-moto-1' })` $\rightarrow$ Active assignment deleted.
  7. `acceptTrip({ driverId, tripId: 'trip-taxi-2' })` $\rightarrow$ Succeeds immediately.
* **Result:** **PASS (2.6992ms)**

### Test Case 2: High-Concurrency Simultaneous Acceptance Race Condition
* **Scenario:** High-concurrency scenario simulating two accept requests arriving at the identical millisecond using `Promise.allSettled`.
* **Execution:**
  ```javascript
  const results = await Promise.allSettled([
    env.service.acceptTrip({ driverId, tripId: tripM.id }),
    env.service.acceptTrip({ driverId, tripId: tripT.id }),
  ]);
  ```
* **Observed Outcome:**
  * Total fulfilled: `1`
  * Total rejected: `1`
  * Rejection error code: `409 ConflictException`
  * Rejection message: `"ท่านมีงานที่กำลังดำเนินการอยู่แล้ว ไม่สามารถรับงานซ้อนได้"`
  * Database state: Exactly 1 record in `driver_active_assignments`.
* **Result:** **PASS (0.6654ms)**

### Test Case 3: State Lifecycle & Active Lock Progression
* **State Progression Verified:**
  1. `acceptTrip` $\rightarrow$ State: `ACCEPTED` (Assignment Created).
  2. `markDriverArrived` $\rightarrow$ State: `ARRIVED` (Assignment Updated).
  3. `startTrip` $\rightarrow$ State: `IN_PROGRESS` (Assignment Updated).
  4. `completeTrip` $\rightarrow$ Assignment deleted from PostgreSQL; Redis key `driver:{id}:active_assignment` cleared; driver marked `IDLE`.
* **Result:** **PASS (1.7883ms)**

### Test Case 4: Passenger Cancellation Lock Release
* **Scenario:** Passenger cancels ride while driver is assigned.
* **Execution:** `PassengerService.cancelRide()` triggers atomic deletion of `driver_active_assignments` for the trip, resets driver status to `IDLE`, and refunds points if charged.
* **Result:** **PASS**

### Test Case 5: Admin Cancellation Lock Release
* **Scenario:** Admin intervenes and cancels ride via `AdminService.cancelTripByAdmin()`.
* **Execution:** Cleans up `driver_active_assignments`, clears Redis locks, resets driver to `IDLE`.
* **Result:** **PASS**

---

## 3. Concurrency Safety Summary

| Test Case | Method | Concurrency Guarantee | Result |
| :--- | :--- | :--- | :---: |
| Single Ride Lock | `acceptTrip()` | Checked before trip assignment | **PASS** |
| Unique Constraint | PostgreSQL | `driver_id UNIQUE` blocks race conditions | **PASS** |
| Dual Mobility Collision | MOTO + TAXI | Driver cannot bridge two active trips | **PASS** |
| Completion Release | `completeTrip()` | Deletes row and resets Redis | **PASS** |
| Passenger Cancel Release | `cancelRide()` | Cleanly deletes row and resets Redis | **PASS** |
| Admin Cancel Release | `cancelTripByAdmin()` | Cleanly deletes row and resets Redis | **PASS** |
