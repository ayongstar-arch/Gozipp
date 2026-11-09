# GOZIPP DUAL MOBILITY PLATFORM — STAGE 4
## Gate B: End-to-End Architecture Design & System Interaction Specification

**Document ID:** GOZIPP-STAGE-4-ARCHITECTURE-DESIGN  
**Version:** 1.0  
**Status:** DESIGN CERTIFIED  
**Architect:** Antigravity AI Engineering Engine  
**Target Environment:** Development / Staging Isolation  
**Date:** 2026-11-08  

---

## 1. System Architecture Overview

The Stage 4 Passenger Booking and Driver Operational Experience extends the GOZIPP platform to deliver a unified yet strictly isolated dual mobility journey for both **MOTO** (Motorcycle Taxi) and **TAXI** (`PUBLIC_TAXI` and `PRIVATE_CAR_FOR_HIRE`).

The architecture is governed by four core architectural pillars:
1. **Preserve MOTO Integrity:** MOTO matching (`FairQueueService`), 0% GP driver commission, and 2 THB passenger system fee remain completely unaltered.
2. **Isolate TAXI Dispatch:** TAXI matching runs through `TaxiMatchingService` with progressive radius expansion (1.5 km $\rightarrow$ 3.0 km $\rightarrow$ 5.0 km $\rightarrow$ 8.0 km) and deterministic scoring. Public booking remains strictly disabled via feature flag `TAXI_PUBLIC_BOOKING_ENABLED=false`.
3. **P0 Global Active Ride Lock:** A single driver may hold at most one active ride across all mobility services, guaranteed by PostgreSQL atomic constraints on `driver_active_assignments`.
4. **Transactional Outbox Reliability:** Trip creation and dispatch trigger events are bound in a single ACID database transaction, eliminating ghost rides and silent dispatch failures.

```mermaid
flowchart TD
    subgraph PassengerFrontend["Passenger Experience (web-passenger)"]
        UI_SELECT["Service Selector (MOTO vs TAXI)"] --> UI_FARE["Fare Estimation"]
        UI_FARE --> UI_BOOK["Book Ride (with Idempotency Key)"]
        UI_BOOK --> UI_TRACK["Real-time Trip Tracking"]
    end

    subgraph BackendAPI["NestJS Core API (packages/api)"]
        API_ESTIMATE["FareEstimationService"]
        API_BOOK["PassengerService.requestRide()"]
        OUTBOX_TABLE[("outbox_events Table")]
        OUTBOX_WORKER["OutboxProcessorService"]
        
        API_BOOK -->|ACID Transaction| DB_TRIP[("trips Table")]
        API_BOOK -->|ACID Transaction| OUTBOX_TABLE
        OUTBOX_TABLE -.->|Poll & Dispatch| OUTBOX_WORKER
    end

    subgraph DispatchEngine["Dispatch & Matching Engine"]
        OUTBOX_WORKER --> ROUTER{"Service Type Router"}
        ROUTER -->|MOTO| MOTO_MATCH["FairQueueService (Win Station)"]
        ROUTER -->|TAXI| TAXI_MATCH["TaxiMatchingService (Progressive Radius)"]
    end

    subgraph DriverFrontend["Driver Operational Experience (mobile-driver)"]
        MOTO_MATCH -->|RIDE_OFFER| DRV_MODAL["Incoming Offer Modal"]
        TAXI_MATCH -->|TAXI_RIDE_OFFER| DRV_MODAL
        DRV_MODAL --> DRV_ACCEPT["Accept Offer"]
        DRV_ACCEPT -->|Atomic Transaction| LOCK_TABLE[("driver_active_assignments (P0 Lock)")]
        DRV_ACCEPT --> DRV_NAV["Pickup Navigation & Arrival Check"]
    end
```

---

## 2. End-to-End Sequence Workflows

### 2.1 Dual Mobility Booking & Transactional Outbox Dispatch Sequence

The following sequence illustrates the transactional guarantee ensuring no trip is created without an associated dispatch event.

```mermaid
sequenceDiagram
    autonumber
    actor Passenger as Passenger (Client)
    participant API as Passenger API (NestJS)
    participant DB as PostgreSQL Database
    participant OutboxWorker as Outbox Worker
    participant Redis as Redis Pub/Sub
    participant Gateway as Socket.IO Gateway
    actor Driver as Eligible Driver

    Passenger->>API: POST /api/v1/passenger/fare-estimate (pickup, dest, serviceType)
    API-->>Passenger: FareEstimateDto (estimatedFare, distanceKm, etaMins)
    
    Passenger->>API: POST /api/v1/passenger/ride/request (Idempotency-Key, serviceType, pickup, dest)
    Note over API,DB: Begin PostgreSQL Transaction
    API->>DB: INSERT INTO trips (id, passenger_id, service_type, status='SEARCHING', ...)
    API->>DB: INSERT INTO outbox_events (id, aggregate_type='TRIP', event_type='RIDE_REQUESTED', payload, status='PENDING')
    Note over API,DB: Commit Transaction (Atomic Persistence)
    API-->>Passenger: RideResponse (tripId, status='SEARCHING', fare)

    loop Outbox Processor (Every 500ms)
        OutboxWorker->>DB: SELECT * FROM outbox_events WHERE status='PENDING' FOR UPDATE SKIP LOCKED
        OutboxWorker->>Redis: PUBLISH 'ride:requested' (tripId)
        OutboxWorker->>DB: UPDATE outbox_events SET status='PUBLISHED', published_at=NOW()
    end

    Redis->>Gateway: Event 'ride:requested'
    Gateway->>Gateway: Route by service_type ('MOTO' vs 'TAXI')
    
    alt service_type == 'TAXI'
        Gateway->>Gateway: TaxiMatchingService.dispatchTaxiTrip(tripId)
        Gateway->>Driver: Socket Emit 'TAXI_RIDE_OFFER' (offerId, tripId, timeoutSeconds=15)
    else service_type == 'MOTO'
        Gateway->>Gateway: FairQueueService.findBestDriver(tripId)
        Gateway->>Driver: Socket Emit 'RIDE_OFFER' (tripId, timeoutSeconds=15)
    end
```

---

### 2.2 Driver Arrival Verification Sequence

Arrival verification prevents fraudulent or premature "Driver Arrived" claims by combining GPS geofence checks, coordinate accuracy thresholds, and location freshness rules.

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Driver App
    participant API as Driver API / Gateway
    participant DB as PostgreSQL
    actor Passenger as Passenger App

    Driver->>API: Emit TRIP_DRIVER_ARRIVED { tripId, lat, lng, accuracy, timestamp }
    API->>DB: SELECT pickup_lat, pickup_lng, status, driver_id FROM trips WHERE id = tripId
    
    alt Status != 'ACCEPTED' OR Driver != Authorized Driver
        API-->>Driver: Emit TRIP_ERROR ("Invalid state transition")
    else Location Stale (> 60s) OR Accuracy > 50m
        API->>DB: UPDATE trips SET arrived_at=NOW(), arrival_verified=false, status='DRIVER_ARRIVED'
        API->>DB: UPDATE driver_active_assignments SET state='ARRIVED'
        API-->>Passenger: TRIP_STATUS_UPDATE (status='DRIVER_ARRIVED', verification='LOCATION_UNVERIFIED')
        API-->>Driver: TRIP_ARRIVED_CONFIRMED (verified=false, warning="GPS accuracy low")
    else Distance to Pickup <= 100m AND Accuracy <= 50m
        API->>DB: UPDATE trips SET arrived_at=NOW(), arrival_verified=true, status='DRIVER_ARRIVED'
        API->>DB: UPDATE driver_active_assignments SET state='ARRIVED'
        API-->>Passenger: TRIP_STATUS_UPDATE (status='DRIVER_ARRIVED', verification='VERIFIED')
        API-->>Driver: TRIP_ARRIVED_CONFIRMED (verified=true)
    end
```

---

### 2.3 Concurrency & Race Condition Resolution: Passenger Cancel vs Driver Accept

When a passenger attempts to cancel a ride at the exact moment a driver attempts to accept it, the database atomic transaction guarantees deterministic resolution.

```mermaid
sequenceDiagram
    autonumber
    actor Passenger as Passenger
    actor Driver as Driver
    participant API as Backend Service
    participant DB as PostgreSQL (ACID)

    par Concurrent Execution
        Passenger->>API: POST /api/v1/passenger/ride/:id/cancel
        Driver->>API: POST /api/v1/driver/taxi-offers/:offerId/accept
    end

    Note over API,DB: Transaction A (Driver Accept) starts
    API->>DB: SELECT status FROM trips WHERE id = tripId FOR UPDATE
    Note over DB: Row locked by Transaction A
    
    Note over API,DB: Transaction B (Passenger Cancel) waits on lock
    
    API->>DB: Status is 'SEARCHING' -> Set status='ACCEPTED', driver_id=driverId
    API->>DB: INSERT INTO driver_active_assignments (driver_id, trip_id, state='ASSIGNED')
    Note over API,DB: Transaction A commits! Lock released.
    
    API-->>Driver: 200 OK (Trip Accepted, Active Ride Lock Acquired)

    Note over API,DB: Transaction B (Passenger Cancel) resumes
    API->>DB: SELECT status FROM trips WHERE id = tripId
    Note over API,DB: Status is now 'ACCEPTED', not 'SEARCHING'
    API->>DB: Execute Cancellation Policy for 'ACCEPTED' ride
    API->>DB: UPDATE trips SET status='CANCELLED', cancelled_at=NOW()
    API->>DB: DELETE FROM driver_active_assignments WHERE trip_id = tripId
    Note over API,DB: Transaction B commits!
    
    API-->>Passenger: 200 OK (Ride Cancelled after Driver Assignment)
    API-->>Driver: Socket Emit 'RIDE_CANCEL' (Driver notified, Lock released)
```

---

## 3. Component Responsibilities

### 3.1 Web Passenger Frontend (`apps/web-passenger`)
1. **Service Selector Component:** Tab toggle between `MOTO` and `TAXI`. When TAXI is selected:
   - Displays vehicle category options (`PUBLIC_TAXI` and `PRIVATE_CAR_FOR_HIRE`).
   - If `TAXI_PUBLIC_BOOKING_ENABLED=false`, displays an explanatory testing banner: *"GOZIPP TAXI is currently undergoing internal staging certification. Public bookings will be activated soon."*
2. **Fare Quotation Display:** Visualizes estimated fare range, distance, and ETA calculated by `FareEstimationService`.
3. **Idempotent Ride Request:** Generates a client-side UUID `Idempotency-Key` sent with the ride creation request to avoid duplicate bookings during poor mobile network conditions.
4. **Driver Arrival Notification:** Displays verified arrival badge or unverified warning badge based on server verification status.

### 3.2 Mobile Driver Frontend (`apps/mobile-driver`)
1. **Multi-Service Availability Indicators:** Displays dual status toggles for MOTO and TAXI availability in the driver dashboard.
2. **Incoming Job Sheet Modal:**
   - Handles both `RIDE_OFFER` (MOTO) and `TAXI_RIDE_OFFER` (TAXI).
   - Shows badge: `[MOTO]` vs `[PUBLIC_TAXI]` vs `[PRIVATE_CAR_FOR_HIRE]`.
   - Displays Pickup Area, Destination Summary, Estimated Distance, ETA, and 15-second countdown timer.
3. **Arrived Confirmation Action:** Captures high-accuracy GPS coordinates (`accuracy`, `lat`, `lng`, `timestamp`) and transmits them with `TRIP_DRIVER_ARRIVED`.
4. **Active Ride Lock Awareness:** If driver already has an active trip in one service, the UI immediately locks new offer acceptance across all services.

### 3.3 Backend Core (`packages/api`)
1. **`FareEstimationService`:** Pure backend domain service calculating distance-based pricing. Strictly enforces 2 THB fee for MOTO, and blocks real financial transactions for TAXI.
2. **`OutboxService` & `OutboxEventEntity`:** Implements reliable, at-least-once message publishing via PostgreSQL outbox table with correlation IDs and exponential backoff.
3. **`DriverService` Arrival Verification:** Validates Euclidean/Haversine distance between driver coordinates and pickup coordinates ($\le 100\text{m}$), GPS accuracy ($\le 50\text{m}$), and timestamp freshness ($\le 60\text{s}$).
4. **`AppGateway` Router:** Dynamically routes dispatch requests to `FairQueueService` (MOTO) or `TaxiMatchingService` (TAXI).

---

## 4. Architectural Boundaries & Non-Negotiable Constraints
- **Zero Payment Capture:** No credit card charging, payment gateway tokenization, or bank debiting shall occur in Stage 4.
- **Zero Public Taxi Launch:** Feature flag `TAXI_PUBLIC_BOOKING_ENABLED` defaults to `false`.
- **Zero Alteration to MOTO Pricing:** MOTO remains 0% GP driver commission and 2 THB passenger system fee.
