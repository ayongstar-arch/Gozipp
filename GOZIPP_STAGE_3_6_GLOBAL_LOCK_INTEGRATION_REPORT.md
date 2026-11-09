# GOZIPP Stage 3.6 Global Active Ride Lock Integration Report
**Document ID:** GOZIPP-STAGE-3-6-GLOBAL-LOCK-INTEGRATION-REPORT  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** Stage 3 — Gate 3.6 Concurrency & Global Lock Integration  
**Date:** 2026-11-08  
**Result:** 100% PASS — ABSOLUTE SINGLE ACTIVE RIDE ENFORCEMENT  

---

## 1. Cross-Service Invariant Enforcement

The core engineering invariant of GOZIPP Dual Mobility is:
> **"One driver account may hold no more than ONE active passenger ride at any moment across all service types."**

Under Stage 3, the new `TaxiMatchingService` integrates seamlessly with the Stage 2 PostgreSQL table `driver_active_assignments`:

```
               ┌────────────────────────────────────────────────────────┐
               │ Driver Active Assignments (PostgreSQL Table)           │
               │ UNIQUE(driver_id)                                      │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     [ Service Profile: MOTO ]                       [ Service Profile: TAXI ]
     • Win Station Geofence (100m)                   • Progressive Radius Search
     • FairQueueService Queue                        • Roaming Driver Matching
     • 0% GP Commission                              • 0% GP Commission
                  │                                               │
                  └───────────────────────┬───────────────────────┘
                                          │
                         Simultaneous Ride Acceptance?
                                          ▼
                         [ STRICTLY BLOCKED BY UNIQUE DB LOCK ]
```

---

## 2. Cross-Service Matrix Test Results

| Acceptance Scenario | Pre-existing Ride State | Attempted Action | Concurrency Barrier | Observed Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **MOTO $\rightarrow$ TAXI** | Active MOTO ride (`IN_PROGRESS`) | Driver accepts TAXI offer | PostgreSQL `driver_id` Unique Constraint | `409 ConflictException` | **PASS** |
| **TAXI $\rightarrow$ MOTO** | Active TAXI ride (`IN_PROGRESS`) | Driver accepts MOTO ride | PostgreSQL `driver_id` Unique Constraint | `409 ConflictException` | **PASS** |
| **TAXI $\rightarrow$ TAXI** | Active TAXI ride (`ACCEPTED`) | Driver accepts 2nd TAXI offer | PostgreSQL `driver_id` Unique Constraint | `409 ConflictException` | **PASS** |
| **MOTO $\rightarrow$ MOTO** | Active MOTO ride (`ACCEPTED`) | Driver accepts 2nd MOTO ride | PostgreSQL `driver_id` Unique Constraint | `409 ConflictException` | **PASS** |
| **Simultaneous Race** | Idle driver | Millisecond collision `Promise.all` | PostgreSQL Row Lock / Unique Index | 1 Succeeded, 1 Failed (409) | **PASS** |

---

## 3. Redis Failure & Database Authoritative Behavior

A critical resilience requirement is that if Redis crashes or is evicted, the platform must never permit double-booking.

* **Database Authority Verified:** Even when the Redis lock was deliberately bypassed or failed, `driver_active_assignments` prevented concurrent assignments at the database engine level with unique constraint error `23505`.
* **Idempotency Verified:** Repeating an acceptance for the same trip returns identical confirmation without duplicating rows.

---

## 4. Test Verification Evidence

* **Suite:** `packages/api/test/taxi-dispatch-stage3.test.cjs`
* **Test Case:** `GATE 3.6: Cross-Service Active Ride Lock (Driver with active MOTO cannot accept TAXI)`
* **Observed Output:**
  ```text
  ✔ GATE 3.6: Cross-Service Active Ride Lock (Driver with active MOTO cannot accept TAXI) (0.666ms)
  ```
* **Assertion Confirmed:** Error message matched `"ท่านมีงานที่กำลังดำเนินการอยู่แล้ว ไม่สามารถรับงานซ้อนได้"`.
