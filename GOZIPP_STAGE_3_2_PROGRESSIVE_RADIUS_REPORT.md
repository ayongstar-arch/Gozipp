# GOZIPP Stage 3.2 Progressive Radius Matching Report
**Document ID:** GOZIPP-STAGE-3-2-PROGRESSIVE-RADIUS-REPORT  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** Stage 3 — Gate 3.2 Progressive Radius Search  
**Service:** `TaxiMatchingService`  
**Date:** 2026-11-08  
**Result:** 100% PASS  

---

## 1. Progressive Search Architecture

Unlike motorcycle taxi matching which operates within a 100-meter fixed Win station geofence, car taxis operate across open urban road networks. The system executes an incremental, multi-round search to minimize passenger wait times and avoid unnecessary dispatch over long distances:

```
          ┌─────────────────────────────────────────────────────────┐
          │ Round 1: Immediate Proximity (0.00 – 1.50 km)           │
          └────────────────────────────┬────────────────────────────┘
                                       │ (No available driver)
                                       ▼
          ┌─────────────────────────────────────────────────────────┐
          │ Round 2: Local Neighborhood (1.50 – 3.00 km)            │
          └────────────────────────────┬────────────────────────────┘
                                       │ (No available driver)
                                       ▼
          ┌─────────────────────────────────────────────────────────┐
          │ Round 3: Extended Sub-district (3.00 – 5.00 km)         │
          └────────────────────────────┬────────────────────────────┘
                                       │ (No available driver)
                                       ▼
          ┌─────────────────────────────────────────────────────────┐
          │ Round 4: Configurable Maximum (5.00 – 8.00 km)          │
          └────────────────────────────┬────────────────────────────┘
                                       │ (No available driver)
                                       ▼
                      [ Final State: NO_DRIVER_FOUND ]
```

---

## 2. Progressive Radius Specification

| Search Round | Search Radius | Offer Timeout | Target Driver Cohort | Expected ETA |
| :---: | :---: | :---: | :--- | :---: |
| **Round 1** | **1.5 km** | 15 seconds | Immediate street proximity | $1 - 3$ mins |
| **Round 2** | **3.0 km** | 15 seconds | Adjacent alleys & main thoroughfare | $3 - 6$ mins |
| **Round 3** | **5.0 km** | 15 seconds | Surrounding sub-district area | $6 - 10$ mins |
| **Round 4** | **8.0 km** | 15 seconds | Outer district perimeter | $10 - 16$ mins |

---

## 3. Duplicate Prevention & Exclusion Guarantees

To prevent spamming drivers with repeated offers for the same trip:
1. **`excludedDriverIds` Set:** Retains all drivers who:
   - Were offered in a previous radius round.
   - Explicitly rejected the offer.
   - Allowed the offer countdown to expire.
2. **Atomic Set Registration in Redis:** `SADD trip:${tripId}:excluded_drivers ${driverId}` ensures multi-node cluster synchronization.
3. **No Duplicate Returns:** In empirical testing, a driver queried in Round 1 was never returned in Round 2 or Round 3.

---

## 4. Location Freshness Enforcement

* **Rule:** Driver GPS updates older than 5 minutes (`300,000ms`) are rejected as stale.
* **Rationale:** A vehicle moving at 30 km/h covers 2.5 km in 5 minutes. Dispatching based on stale GPS coordinates creates unacceptable passenger delays and driver cancellation rates.
* **Test Verification:** Driver with location timestamp 15 minutes ago was rejected with 0 candidates returned.

---

## 5. Test Execution Evidence

* **Suite:** `packages/api/test/taxi-dispatch-stage3.test.cjs`
* **Test Case 1:** `GATE 3.2: Progressive Radius Expansion (1.5km -> 3.0km -> 5.0km without duplicate candidates)`
  - Round 1 found Driver 1 (`d-1km` at 1.09 km).
  - Round 2 found Driver 2 (`d-2.5km` at 2.49 km).
  - Round 3 found Driver 3 (`d-4.2km` at 4.20 km).
  - Round 4 excluded Driver 4 (`d-10km` at 12 km).
  - **Result: PASS (0.9486ms)**
* **Test Case 2:** `GATE 3.2: Stale driver GPS location (> 5 mins) is strictly excluded`
  - Stale driver excluded.
  - **Result: PASS (0.4366ms)**
