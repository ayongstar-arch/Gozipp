# GOZIPP Stage 3.5 Offer and Acceptance Engine Report
**Document ID:** GOZIPP-STAGE-3-5-OFFER-ACCEPTANCE-REPORT  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** Stage 3 — Gate 3.5 Offer and Acceptance  
**Service:** `TaxiMatchingService.createOffer()` & `TaxiMatchingService.acceptOffer()`  
**Date:** 2026-11-08  
**Result:** 100% PASS  

---

## 1. Offer Architecture & Lifecycle

The Taxi Offer Engine handles real-time offer issuance, countdown expiration, and tamper-proof acceptance:

```
[ TaxiMatchingService ] ──────────────► [ Redis: offer:{offerId} ]
          │                                      │
          ▼ (Socket.IO TAXI_RIDE_OFFER)          ▼ (TTL: 15s)
[ Driver App Screen ]                  [ Server Expiration Timer ]
          │                                      │
          ▼                                      ▼
[ Driver Clicks Accept ]              [ Auto-transition to TIMEOUT ]
          │
          ▼
[ POST /api/v1/driver/taxi/offers/:offerId/accept ]
          │
          ├── 1. Check Offer Recipient Ownership (req.user.sub == offer.driverId)
          ├── 2. Verify Server Time <= offer.expiresAt
          ├── 3. Re-check Driver & Vehicle Eligibility (VERIFIED)
          ├── 4. PostgreSQL Transaction: INSERT driver_active_assignments
          └── 5. Commit, Update Status to BUSY, Emit TAXI_OFFER_ACCEPTED
```

---

## 2. Server-Authoritative 10-Step Acceptance Sequence

To prevent double-booking, race conditions, or network replay attacks, `acceptOffer()` executes the following strict 10-step sequence:

1. **Offer Fetching:** Retrieves offer record from Redis `offer:${offerId}`.
2. **Offer Ownership Verification:** Asserts `offer.driverId === req.user.sub`. Unauthorized drivers receive `401 UnauthorizedException` (`คุณไม่มีสิทธิ์ตอบรับข้อเสนอนี้`).
3. **Server Timestamp Validation:** Validates `Date.now() <= offer.expiresAt`. If expired, rejects with `400 Bad Request` (`ข้อเสนองานนี้หมดเวลาตอบรับแล้ว`).
4. **Pre-Transaction Lock Check:** Asserts that driver has no active row in `driver_active_assignments`.
5. **Real-time Eligibility Re-check:** Re-verifies that driver is not suspended and vehicle remains `VERIFIED`.
6. **Transaction Boundary Initiation:** Enters atomic database transaction.
7. **PostgreSQL Unique Lock Acquisition:** Inserts record into `driver_active_assignments`. A unique constraint violation (`23505`) safely throws `409 ConflictException`.
8. **Trip Mutation:** Sets `trips.status = 'ACCEPTED'`, `driver_id`, `vehicle_id`, and `accepted_at`.
9. **Driver Mutation:** Sets `drivers.current_status = 'BUSY'`.
10. **Redis Fast-Path Update & Event Broadcast:**
    - Caches `driver:${driverId}:active_assignment` $\rightarrow$ `tripId`.
    - Deletes `offer:${offerId}` and `driver:${driverId}:pending_offer`.
    - Emits `TAXI_OFFER_ACCEPTED` to client.

---

## 3. Multi-Channel Interface Support

Drivers can accept and reject offers through both real-time WebSocket and HTTP REST channels:

### 3.1 WebSocket Events (`AppGateway`)
* **Event Received:** `TAXI_OFFER_ACCEPT` with `{ offerId: string }`
* **Event Emitted:** `TAXI_OFFER_ACCEPTED` with confirmation payload
* **Event Received:** `TAXI_OFFER_REJECT` with `{ offerId: string, reason?: string }`

### 3.2 REST API Endpoints (`DriverController`)
* `POST /api/v1/driver/taxi/offers/:offerId/accept` (Guarded by `AuthGuard`, `RolesGuard`, `@Roles('DRIVER')`)
* `POST /api/v1/driver/taxi/offers/:offerId/reject` (Guarded by `AuthGuard`, `RolesGuard`, `@Roles('DRIVER')`)

---

## 4. Test Verification Evidence

* **Suite:** `packages/api/test/taxi-dispatch-stage3.test.cjs`
* **Test Case:** `GATE 3.4 & 3.5: Offer creation, server-authoritative timeout & ownership security`
* **Evidence Verified:**
  1. Driver A offer creation verified with unique offer key.
  2. Driver B (unauthorized) attempting to accept Driver A offer: **Blocked (401 Unauthorized)**.
  3. Driver A accepting after expiry: **Blocked (400 Bad Request)**.
  4. Driver A accepting within TTL: **Success (200 OK)**.
  5. Active assignment created in PostgreSQL.
* **Result:** **PASS (2.0749ms)**
