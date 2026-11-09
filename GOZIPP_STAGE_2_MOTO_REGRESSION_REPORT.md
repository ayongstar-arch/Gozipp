# GOZIPP Stage 2 MOTO Regression & Business Invariance Report
**Document ID:** GOZIPP-STAGE-2-MOTO-REGRESSION-REPORT  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** STAGE 2 — Gate 2.9 Automated Regression Verification  
**Date:** 2026-11-08  
**Result:** ZERO REGRESSION — 100% BUSINESS INVARIANCE VERIFIED  

---

## 1. MOTO Business Rules Invariance Matrix

A core directive of Stage 2 is that extending the platform to car taxis must **never** disrupt existing motorcycle taxi operations or modify MOTO business rules:

| MOTO Business Rule | Directive Requirement | Stage 2 Verified State | Regression Status |
| :--- | :--- | :--- | :---: |
| **Driver Commission** | Strictly 0% (No GP) | Driver receives 100% of fare (25.00 THB credited as 25.00 THB) | **PASS (0% GP Intact)** |
| **Passenger System Fee**| Fixed 2 THB (2 points) | Flat 2 THB deduction via `CreditService` | **PASS (Fee Intact)** |
| **Free Ride Quota** | 3 Free Rides for new riders | `free_rides_remaining` and deduction logic untouched | **PASS (Intact)** |
| **Welcome Bonus** | 60 Community Points | Welcome promotion JSON & credit balance untouched | **PASS (Intact)** |
| **Win Stations** | 100m Geofence Matching | PostGIS 100-meter geofence and FairQueueService untouched | **PASS (Intact)** |
| **Driver Plate Column** | Preserve `drivers.plate` | Column retained and read by legacy fallback | **PASS (Intact)** |
| **Win ID Column** | Preserve `drivers.station_id` | Column retained and indexed | **PASS (Intact)** |

---

## 2. Regression Test Evidence

### Test Suite: `node --test packages/api/test/*.test.cjs`
All 12 automated tests across passenger registration, trip lifecycles, global lock, vehicle APIs, and MOTO regression passed cleanly:

```
✔ P0: Global Active Ride Lock blocks a driver from accepting multiple trips concurrently (2.6992ms)
✔ GATE 2.6: DLT eligibility and vehicle verification constraints (1.0031ms)
✔ GATE 2.7: Simultaneous MOTO and TAXI availability and gating controls (0.7073ms)
✔ P0: High-concurrency simultaneous acceptance race condition safely resolves to exactly 1 winner (0.6654ms)
✔ PRESERVATION: Existing MOTO business rules remain 100% intact (0% GP, 2 THB fee) (0.4734ms)
✔ registration requires the OTP delivered for the canonical phone number (169.0204ms)
✔ a verified OTP is single-use (123.5572ms)
✔ SMS delivery failure leaves no usable OTP (67.6795ms)
✔ temporary non-production mode can register without OTP (1.1757ms)
✔ production never permits registration without OTP (0.4859ms)
✔ PIN is hashed, persisted, and can be used for a new login session (496.7243ms)
✔ driver trip lifecycle persists only valid ordered transitions (1.7883ms)

Total Tests: 12
Suites: 0
Pass: 12
Fail: 0
Duration: 5.33 seconds
```

### Empirical Proof of 0% Driver GP:
In `PRESERVATION: Existing MOTO business rules remain 100% intact (0% GP, 2 THB fee)`:
* Initial driver total earnings: `200.00 THB`
* Trip fare: `25.00 THB`
* Final driver total earnings after trip completion: `225.00 THB`
* Commission deducted: `0.00 THB` (0.00%).

---

## 3. Backward Compatibility Proof

Existing drivers who have not yet added a vehicle through the new Vehicle API are fully supported via legacy fallback:
1. `DriverService.acceptTrip` checks for an active vehicle in `driver_service_profiles`.
2. If none exists, it looks up `driver_vehicles` or falls back gracefully to `drivers.plate`.
3. The trip is accepted and completed without null-pointer errors or schema mismatch crashes.
