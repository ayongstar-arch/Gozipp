# GOZIPP Dual Mobility State Machine Specifications
**Document ID:** GOZIPP-STATE-01  
**Project:** GOZIPP Dual Mobility Platform (MOTO + TAXI)  
**Stage:** STAGE 1 — Technical Contract Design  
**Status:** DRAFTED FOR APPROVAL  
**Scope:** 6 Independent, Decoupled State Machines  
**Date:** 2026-11-08  

---

## 1. Overview of the 6 Decoupled State Machines

To prevent architectural coupling, GOZIPP Dual Mobility separates system states into **6 independent state machines**:

```
1. Driver Identity State      (Who the human driver is & KYC standing)
2. Vehicle Verification State (Legal verification standing of a registered vehicle)
3. Vehicle Availability State (Which vehicle is selected for active service)
4. Service Availability State (Online/offline readiness per service type: MOTO vs TAXI)
5. Global Active Assignment   (P0 Global Active Ride Lock concurrency state)
6. Trip Lifecycle State       (End-to-end journey progression)
```

---

## 2. State Machine 1: Driver Identity Lifecycle

Governs the personal registration, KYC, and account standing of the human driver in the `drivers` table.

```mermaid
stateDiagram-v2
    [*] --> PENDING: POST /driver/register
    PENDING --> PENDING_REVIEW: Complete Onboarding Steps 1-5
    PENDING_REVIEW --> APPROVED: Admin Approves Identity
    PENDING_REVIEW --> REJECTED: Admin Rejects Identity
    PENDING_REVIEW --> REUPLOAD_REQUESTED: Admin Requests Better ID/License

    REUPLOAD_REQUESTED --> PENDING_REVIEW: Driver Uploads New Document

    APPROVED --> SUSPENDED: Admin Suspends (Fraud/Violations)
    SUSPENDED --> APPROVED: Admin Reinstates

    REJECTED --> [*]
```

### 1.1 States & Transition Triggers
| State | Allowed Transitions | Trigger | Guard / Preconditions |
| :--- | :--- | :--- | :--- |
| **`PENDING`** | `PENDING_REVIEW` | `POST /driver/onboarding/submit` | Driver completed profile, initial document upload, and training modules. |
| **`PENDING_REVIEW`** | `APPROVED`, `REJECTED`, `REUPLOAD_REQUESTED` | `POST /admin/drivers/approve` or `reject` | Action performed by authenticated administrator with role `ADMIN` or `SUPERADMIN`. |
| **`APPROVED`** | `SUSPENDED` | `POST /admin/drivers/status` | Account suspension immediately sets all child service profiles to `SUSPENDED`. |
| **`SUSPENDED`** | `APPROVED` | `POST /admin/drivers/status` | Account reinstatement; child services revert to `OFFLINE`. |

---

## 3. State Machine 2: Vehicle Verification Lifecycle

Governs the legal status of an individual physical vehicle in the `driver_vehicles` table.

```mermaid
stateDiagram-v2
    [*] --> PENDING: POST /driver/vehicles (New Vehicle)
    [*] --> LEGACY_REVIEW: Database Migration (Existing Motorcycle)

    PENDING --> VERIFIED: Admin Approves DLT Documents
    PENDING --> REJECTED: Admin Rejects (Invalid / Disqualified)

    LEGACY_REVIEW --> VERIFIED: Admin Completes Formal DLT Audit
    LEGACY_REVIEW --> SUSPENDED: Grace Period Expired / Policy Failure

    VERIFIED --> EXPIRED: Insurance / Inspection Expiry Date Passed
    VERIFIED --> SUSPENDED: DLT Blacklist / Incident Suspension

    EXPIRED --> PENDING: Driver Uploads Renewed Documents
    SUSPENDED --> VERIFIED: Admin Reinstates Following Compliance Audit

    REJECTED --> [*]
```

### 3.1 States & Operational Rights
* **`PENDING`:** Initial state for all newly registered cars or motorcycles. **Dispatch Rights: NONE.**
* **`LEGACY_REVIEW` (Mandatory Correction A):** Initial state assigned to existing operational motorcycle drivers during database migration. **Dispatch Rights: Permitted for MOTO only** during an administrative 90-day grace period. Strictly barred from TAXI.
* **`VERIFIED`:** Fully audited by administrator against Thai DLT standards. **Dispatch Rights: FULL** for the vehicle's approved classification.
* **`REJECTED`:** Permanently barred from receiving trips.
* **`EXPIRED`:** Automatically triggered by cron when commercial insurance, tax circle, or vehicle inspection passes expiry date. **Dispatch Rights: REVOKED.**
* **`SUSPENDED`:** Temporarily barred by administrator due to customer safety incident or inspection failure.

---

## 4. State Machine 3: Vehicle Availability State

Tracks whether a physical vehicle is currently selected by the driver to operate a service in `driver_service_profiles`.

```mermaid
stateDiagram-v2
    [*] --> INACTIVE: Vehicle Registered
    INACTIVE --> ACTIVE_SELECTED: Driver selects vehicle for service
    ACTIVE_SELECTED --> INACTIVE: Driver unselects or swaps vehicle

    note right of ACTIVE_SELECTED
      Guard: Vehicle must be VERIFIED
      (or LEGACY_REVIEW for MOTO).
      Driver must be OFFLINE or IDLE.
    end note
```

### 4.1 Anti-Simultaneous Usage Rule
* A physical vehicle may only be `ACTIVE_SELECTED` by **one driver at a time**.
* A driver cannot have two vehicles active simultaneously under the same service profile.
* Swapping vehicles is strictly prohibited while holding an active ride assignment.

---

## 5. State Machine 4: Service Availability State

Maintained independently per service profile (`MOTO` and `TAXI`) in `driver_service_profiles`.

```mermaid
stateDiagram-v2
    [*] --> OFFLINE: Initial Profile Creation
    OFFLINE --> ONLINE_IDLE: Driver toggles Service ON
    ONLINE_IDLE --> OFFLINE: Driver toggles Service OFF

    ONLINE_IDLE --> ONLINE_BUSY: Global Active Lock Acquired (Any Service)
    ONLINE_BUSY --> ONLINE_IDLE: Global Active Lock Released

    ONLINE_IDLE --> SUSPENDED: Account or Vehicle Suspended
    ONLINE_BUSY --> SUSPENDED: Emergency Admin Action
    SUSPENDED --> OFFLINE: Admin Clears Suspension
```

### 5.1 Service Cross-Interaction Rule
When the Global Active Lock is acquired on **either** service:
* If driver is `ONLINE_IDLE` on MOTO and `ONLINE_IDLE` on TAXI, and accepts a MOTO trip:
  * MOTO service status transitions to `ONLINE_BUSY`.
  * TAXI service status transitions to `ONLINE_BUSY` (frozen).
* Both services transition back to `ONLINE_IDLE` simultaneously when the ride completes.

---

## 6. State Machine 5: Global Active Assignment (P0 Concurrency Engine)

Authoritatively stored in `driver_active_assignments`.

```mermaid
stateDiagram-v2
    [*] --> UNASSIGNED: Driver Online & Available

    UNASSIGNED --> LOCKED_ASSIGNED: Atomic acceptTrip() Transaction
    note right of LOCKED_ASSIGNED
      PostgreSQL Unique Row Committed.
      Redis SET NX Acquired.
      Prevents all other dispatches.
    end note

    LOCKED_ASSIGNED --> RELEASING: completeTrip() or cancelRide() Initiated
    RELEASING --> UNASSIGNED: Ledger Deduct Committed & Lock Deleted
```

### 6.1 Assignment State Guarantees
1. **`UNASSIGNED`:** No row exists in `driver_active_assignments` for `driver_id`. The driver is eligible for dispatch matching.
2. **`LOCKED_ASSIGNED`:** Exactly one row exists. Any subsequent attempt to insert a row for `driver_id` triggers a PostgreSQL unique constraint violation (`uq_active_assignment_driver`), immediately aborting concurrent acceptance attempts.
3. **`RELEASING`:** Temporary transition state ensuring wallet deductions and ledger entries are cleanly committed before the lock row is deleted.

---

## 7. State Machine 6: Trip Lifecycle State Machine

Governs individual trip records in `trips`.

```mermaid
stateDiagram-v2
    [*] --> SEARCHING: POST /ride/request
    [*] --> SCHEDULED: Advance Booking Requested

    SCHEDULED --> SEARCHING: Time Reached (T-15 mins)
    SEARCHING --> ACCEPTED: TRIP_ACCEPT (Within 15s Offer Window)
    SEARCHING --> TIMEOUT_NO_DRIVER: 60s Timeout (No Acceptance)
    SEARCHING --> CANCELLED: Passenger Cancels

    ACCEPTED --> DRIVER_ARRIVED: markDriverArrived()
    ACCEPTED --> CANCELLED: Passenger / Driver Cancels

    DRIVER_ARRIVED --> IN_PROGRESS: startTrip()
    DRIVER_ARRIVED --> CANCELLED: Emergency Cancellation

    IN_PROGRESS --> COMPLETED: completeTrip()

    COMPLETED --> [*]
    CANCELLED --> [*]
    TIMEOUT_NO_DRIVER --> [*]
```

### 7.1 State Transition Validation Matrix
| From State | To State | Initiator | Required Condition | Side Effects |
| :--- | :--- | :--- | :--- | :--- |
| `SEARCHING` | `ACCEPTED` | Driver | Driver holds `UNASSIGNED` assignment state; trip in `SEARCHING` | Inserts `driver_active_assignments` row; emits `TRIP_ACCEPT`. |
| `ACCEPTED` | `DRIVER_ARRIVED` | Driver | GPS distance to pickup $\le 100$m (or manual bypass) | Sets `arrived_at = NOW()`; notifies passenger. |
| `DRIVER_ARRIVED` | `IN_PROGRESS` | Driver | Passenger verified (OTP / PIN match) | Sets `started_at = NOW()`. |
| `IN_PROGRESS` | `COMPLETED` | Driver | Journey destination reached | Releases Global Lock; commits 2 THB system fee; prompts 5-star rating. |
| Any Non-Terminal | `CANCELLED` | Passenger / Driver / Admin | Terminal transition confirmed | Releases Global Lock; triggers point refund if points were reserved. |
