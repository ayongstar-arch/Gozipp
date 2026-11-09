# GOZIPP Stage 3.10 Automated Test & Verification Report
**Document ID:** GOZIPP-STAGE-3-10-TEST-REPORT  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** Stage 3 — Gate 3.10 Automated Testing  
**Date:** 2026-11-08  
**Result:** 20 / 20 TESTS PASSED (100% SUCCESS RATE)  

---

## 1. Test Execution Summary

The complete automated test harness was executed using the Node.js native test runner against the compiled TypeScript distribution:

* **Execution Command:** `node --test packages/api/test/*.test.cjs`
* **Compilation Command:** `npx tsc -p packages/api/tsconfig.json && npx tsc -b`
* **Build Status:** 0 errors
* **Total Tests Executed:** 20
* **Tests Passed:** 20
* **Tests Failed:** 0
* **Total Duration:** 4.84 seconds

---

## 2. Comprehensive Test Ledger

| Group | Test Title | Test File | Duration | Status |
| :---: | :--- | :--- | :---: | :---: |
| **Stage 3** | GATE 3.1: Strict Taxi Eligibility Gating | `taxi-dispatch-stage3.test.cjs` | 3.85ms | **PASS** |
| **Stage 3** | GATE 3.2: Progressive Radius Expansion (1.5km $\rightarrow$ 3.0km $\rightarrow$ 5.0km) | `taxi-dispatch-stage3.test.cjs` | 0.95ms | **PASS** |
| **Stage 3** | GATE 3.3: Deterministic & Explainable Driver Ranking Engine | `taxi-dispatch-stage3.test.cjs` | 0.64ms | **PASS** |
| **Stage 3** | GATE 3.2: Stale driver GPS location (> 5 mins) is strictly excluded | `taxi-dispatch-stage3.test.cjs` | 0.44ms | **PASS** |
| **Stage 3** | GATE 3.4 & 3.5: Offer creation, server timeout & ownership security | `taxi-dispatch-stage3.test.cjs` | 2.07ms | **PASS** |
| **Stage 3** | GATE 3.6: Cross-Service Active Lock (Active MOTO cannot accept TAXI) | `taxi-dispatch-stage3.test.cjs` | 0.67ms | **PASS** |
| **Stage 3** | GATE 3.8: Observability and structured dispatch telemetry collection | `taxi-dispatch-stage3.test.cjs` | 1.74ms | **PASS** |
| **Stage 3** | GATE 3.14: Staging feature flag blocks dispatch when disabled | `taxi-dispatch-stage3.test.cjs` | 0.60ms | **PASS** |
| **Stage 2** | P0: Global Active Ride Lock blocks multiple trips concurrently | `dual-mobility-stage2.test.cjs` | 2.72ms | **PASS** |
| **Stage 2** | GATE 2.6: DLT eligibility and vehicle verification constraints | `dual-mobility-stage2.test.cjs` | 1.19ms | **PASS** |
| **Stage 2** | GATE 2.7: Simultaneous MOTO and TAXI availability and gating controls | `dual-mobility-stage2.test.cjs` | 0.83ms | **PASS** |
| **Stage 2** | P0: High-concurrency simultaneous acceptance race condition | `dual-mobility-stage2.test.cjs` | 0.62ms | **PASS** |
| **Stage 2** | PRESERVATION: MOTO business rules remain intact (0% GP, 2 THB fee) | `dual-mobility-stage2.test.cjs` | 0.41ms | **PASS** |
| **Auth** | Registration requires OTP delivered for canonical phone number | `passenger-registration.test.cjs` | 174.18ms | **PASS** |
| **Auth** | A verified OTP is single-use | `passenger-registration.test.cjs` | 99.68ms | **PASS** |
| **Auth** | SMS delivery failure leaves no usable OTP | `passenger-registration.test.cjs` | 50.86ms | **PASS** |
| **Auth** | Temporary non-production mode can register without OTP | `passenger-registration.test.cjs` | 0.89ms | **PASS** |
| **Auth** | Production never permits registration without OTP | `passenger-registration.test.cjs` | 0.31ms | **PASS** |
| **Auth** | PIN is hashed, persisted, and can be used for new login session | `passenger-registration.test.cjs` | 454.78ms | **PASS** |
| **Core** | Driver trip lifecycle persists only valid ordered transitions | `trip-lifecycle.test.cjs` | 2.02ms | **PASS** |

---

## 3. Actual Console Execution Output

```text
✔ P0: Global Active Ride Lock blocks a driver from accepting multiple trips concurrently (2.7201ms)
✔ GATE 2.6: DLT eligibility and vehicle verification constraints (1.1917ms)
✔ GATE 2.7: Simultaneous MOTO and TAXI availability and gating controls (0.8285ms)
✔ P0: High-concurrency simultaneous acceptance race condition safely resolves to exactly 1 winner (0.6247ms)
✔ PRESERVATION: Existing MOTO business rules remain 100% intact (0% GP, 2 THB fee) (0.4084ms)
✔ registration requires the OTP delivered for the canonical phone number (174.1759ms)
✔ a verified OTP is single-use (99.6762ms)
✔ SMS delivery failure leaves no usable OTP (50.8552ms)
✔ temporary non-production mode can register without OTP (0.8887ms)
✔ production never permits registration without OTP (0.3149ms)
✔ PIN is hashed, persisted, and can be used for a new login session (454.7847ms)
✔ GATE 3.1: Strict Taxi Eligibility Gating (Verification status, active vehicle, account status) (3.8545ms)
✔ GATE 3.2: Progressive Radius Expansion (1.5km -> 3.0km -> 5.0km without duplicate candidates) (0.9486ms)
✔ GATE 3.3: Deterministic & Explainable Driver Ranking Engine (0.6385ms)
✔ GATE 3.2: Stale driver GPS location (> 5 mins) is strictly excluded (0.4366ms)
✔ GATE 3.4 & 3.5: Offer creation, server-authoritative timeout & ownership security (2.0749ms)
✔ GATE 3.6: Cross-Service Active Ride Lock (Driver with active MOTO cannot accept TAXI) (0.666ms)
✔ GATE 3.8: Observability and structured dispatch telemetry collection (1.7379ms)
✔ GATE 3.14: Staging feature flag blocks dispatch when disabled (0.6035ms)
✔ driver trip lifecycle persists only valid ordered transitions (2.0204ms)

ℹ tests 20
ℹ suites 0
ℹ pass 20
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4842.0654
```
