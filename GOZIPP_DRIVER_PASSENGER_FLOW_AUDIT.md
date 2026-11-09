# GOZIPP Driver & Passenger Flow Audit
**Document ID:** GOZIPP-AUDIT-04  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** STAGE 0 — Read-Only Driver & Passenger Flow Audit  
**Status:** COMPLETE & VERIFIED AGAINST SOURCE CODE  
**Audit Date:** 2026-11-08  

---

## 1. End-to-End Passenger Workflow Audit

### 1.1 Authentication & Session
* **Code Reference:** [`apps/web-passenger/src/app/passenger/page.tsx`](file:///c:/Users/acer/Videos/Project/Gozipp/apps/web-passenger/src/app/passenger/page.tsx) & [`packages/api/auth/auth.service.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/auth/auth.service.ts)
* **Observed Flow:**
  1. User opens passenger app; if device has a stored phone (`localStorage.getItem('gozipp_saved_phone')`), app navigates directly to `LOGIN_PIN`.
  2. For new users, phone verification occurs via Firebase Phone Auth (`POST /api/v1/auth/firebase-verify`), followed by 6-digit PIN setup (`POST /api/v1/auth/set-pin`) hashed with Argon2id and `PIN_PEPPER`.
  3. Authentication issues an HttpOnly `access_token` (1 hour) and `refresh_token` stored in PostgreSQL `refresh_tokens`.
* **Dual Mobility Reusability:** 100% reusable. No changes needed.

### 1.2 Service Selection (Current Motorcycle-Only Reality)
* **Code Reference:** [`apps/web-passenger/src/features/booking/HomeView.tsx`](file:///c:/Users/acer/Videos/Project/Gozipp/apps/web-passenger/src/features/booking/HomeView.tsx#L1-L120)
* **Observed Reality:**
  * The booking screen has NO service toggle.
  * All UI labels explicitly reference motorcycle taxi: "เรียกพี่วิน", "วินตลาดกลาง", "เลือกวินขาประจำ", and display motorcycle icons (`<Bike className="..." />`).
  * Fare calculation assumes the flat motorcycle platform fee: 2 points (THB 2.00) system fee.
* **Dual Mobility Requirement:**
  * Must introduce a top-level **Service Selector Pill/Tab** on `HomeView.tsx`:
    * `[🛵 GOZIPP MOTO]` (Motorcycle Taxi — Fast, Agility, Win Network)
    * `[🚕 GOZIPP TAXI]` (Car Taxi — Air-conditioned, Multi-passenger, Luggage)
  * Default selection: `GOZIPP MOTO` (preserves zero behavioral change for existing users).

### 1.3 Booking Creation & Dispatch Request
* **Code Reference:** [`apps/web-passenger/src/hooks/useRide.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/apps/web-passenger/src/hooks/useRide.ts#L218-L286) and [`packages/api/passenger.service.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/passenger.service.ts#L373-L540)
* **Observed Flow:**
  1. Passenger clicks "เรียกรถทันที". Client calls `requestRide(...)`.
  2. Validates point balance (`points_balance >= 2` or `free_rides_remaining > 0` or emergency overdraft permitted).
  3. Saves `TripEntity` with `status: 'SEARCHING'` (or `'SCHEDULED'` if advance time selected).
  4. Stores trip metadata in Redis: `HSET trip:${tripId}`.
  5. Publishes event on Redis channel `ride:requested`.
  6. Backend `AppGateway` picks up the message and calls `offerTripToNextDriver(tripId)`.
* **Dual Mobility Extension:**
  * `RideRequestDto` must include `serviceType: 'MOTO' | 'TAXI'`.
  * The dispatch router inspects `serviceType` to select the matching driver candidate pool.

### 1.4 Live Tracking, Telemetry & Chat
* **Code Reference:** [`apps/web-passenger/src/features/tracking/TrackingView.tsx`](file:///c:/Users/acer/Videos/Project/Gozipp/apps/web-passenger/src/features/tracking/TrackingView.tsx)
* **Observed Flow:**
  * Joins Socket.IO room `trip:${tripId}` via `TRIP_JOIN_ROOM`.
  * Renders live Leaflet map with passenger pickup/destination and driver real-time marker.
  * Provides in-app chat modal (`ChatModal.tsx`) and phone call button.
  * Displays driver name, motorcycle plate, rating, and vehicle photo.
* **Dual Mobility Extension:**
  * Renders appropriate vehicle icon (Motorcycle vs. Car).
  * Displays car-specific attributes for TAXI: Car brand/model (e.g., "Toyota Corolla Altis - สีเขียวเหลือง").

### 1.5 Completion & Post-Trip Rating
* **Code Reference:** `TrackingView.tsx` L45-90 and `passenger.service.ts` L600-645.
* **Observed Flow:**
  * When `rideStatus === 'COMPLETED'`, modal opens with 1-5 star selector, compliment tags, and comment box.
  * Calls `POST /api/v1/passenger/ride/:tripId/rate`.
  * Backend recalculates driver average rating and updates `drivers.rating`.
* **Dual Mobility Reusability:** 100% reusable across both MOTO and TAXI.

---

## 2. End-to-End Driver Workflow Audit

### 2.1 Driver Registration & Onboarding
* **Code Reference:** [`apps/mobile-driver/src/components/DriverApp.tsx`](file:///c:/Users/acer/Videos/Project/Gozipp/apps/mobile-driver/src/components/DriverApp.tsx#L100-L200) & [`packages/api/driver.service.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/driver.service.ts#L174-L200)
* **Observed Reality:**
  * Registration requires phone number, full name, single license plate, and Win invite code (`WIN888`).
  * Onboarding steps: (1) Registration -> (2) Profile -> (3) Document Upload -> (4) Preferences -> (5) Training -> (6) Admin Review.
  * Documents (`ID_CARD`, `LICENSE`, `VEHICLE_PHOTO`, `PLATE_NUMBER`, `SELFIE`) are stored directly on the driver row.
* **Dual Mobility Requirement:**
  * Driver onboarding must accommodate drivers who want to register a Car Taxi in addition to or instead of a Motorcycle.
  * Documents must distinguish between Personal Driver License (Yellow vs. Private) and Vehicle Documents (Vehicle Registration book, Compulsory Insurance, Commercial Tax sticker).

### 2.2 Go Online & Queue Entry
* **Code Reference:** [`packages/api/driver.service.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/driver.service.ts#L202-L226) & [`fair-queue.service.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/fair-queue.service.ts)
* **Observed Flow:**
  1. Driver presses "เริ่มงาน (Go Online)". Emits `DRIVER_UPDATE_STATUS` with GPS coordinates.
  2. Server updates Redis GeoSet: `GEOADD drivers:locations <lng> <lat> <driverId>`.
  3. Server sets status in Redis: `HSET driver:${driverId}:stats status IDLE`.
  4. Server calculates distance to nearest Win station.
  5. If distance `<= 100m`, enters Sorted Set queue: `ZADD win:${winId}:queue <score> <driverId>`.
  6. If distance `> 100m`, status is marked `ROAMING`.
* **Dual Mobility Critical Conflict:**
  * **Car taxis DO NOT belong to Win motorcycle queues.** If a car taxi driver goes online, they must NOT be added to `win:${winId}:queue`, or they would receive motorcycle trips inside narrow alleys, violating dispatch rules.
  * Taxi drivers require an independent **Taxi Availability Pool** based on PostGIS radius or Redis Geo radius (e.g., 3-5 km).

### 2.3 Job Dispatch Offer, Acceptance & Global Lock
* **Code Reference:** [`packages/api/app.gateway.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/app.gateway.ts#L68-L107) and [`driver.service.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/driver.service.ts#L259-L322)
* **Observed Flow:**
  1. Server pops top driver from Win queue.
  2. Sets temporary offer in Redis: `HSET trip:${tripId} offeredDriverId <driverId>`.
  3. Emits `RIDE_OFFER` to `user:${driverId}` with 15-second countdown.
  4. Driver clicks "รับงาน". Emits `TRIP_ACCEPT`.
  5. Server locks trip: `SET trip:${tripId}:lock <driverId> EX 30 NX`.
  6. If acquired, transitions trip to `ACCEPTED`, driver status to `BUSY`, deducts passenger system points, and removes driver from Win queue.
* **Dual Mobility Concurrency Requirement:**
  * **Global Active Ride Lock:** If a driver is currently `BUSY` on a MOTO trip, they must NEVER receive or be allowed to accept a TAXI offer, and vice versa.

### 2.4 Trip Execution & Completion
* **Code Reference:** `packages/api/driver.service.ts` L324-475.
* **Observed Flow:**
  1. `markDriverArrived`: Status -> `DRIVER_ARRIVED`.
  2. `startTrip`: Status -> `IN_PROGRESS`.
  3. `completeTrip`: Status -> `COMPLETED`, driver status reverts to `IDLE`, total trips increments, total earnings increments.
* **Dual Mobility Concurrency Requirement:**
  * When a ride completes or cancels, the Global Active Ride Lock must be atomically released, making the driver eligible for both MOTO and TAXI jobs again.

---

## 3. Workflow Comparison & Dual Mobility Gap Analysis

| Workflow Step | Existing MOTO Implementation | Required TAXI Extension | Conflict / Gap Severity |
| :--- | :--- | :--- | :--- |
| **Driver Registration** | Requires Win invite code (`inviteCode`) | Optional Win invite code; requires DLT vehicle verification | **HIGH** — Must allow taxi registration without a Win station |
| **Vehicle Data** | Single plate string in `drivers.plate` | Dedicated `driver_vehicles` table supporting multiple vehicles per driver | **CRITICAL** — Core schema limitation |
| **Service Toggle** | No service toggle (always MOTO) | Driver UI allows toggling: `[x] MOTO`, `[x] TAXI` | **HIGH** — Requires multi-service availability state |
| **Passenger Booking** | Single request flow for motorcycle | Service picker tab (`MOTO` vs. `TAXI`) with independent fare estimates | **HIGH** — Passenger UI change required |
| **Queue / Dispatch** | Station Win geofence (100m radius) | Cruising/roaming radius matching (3–5 km) | **CRITICAL** — Distinct matching algorithm required |
| **Active Ride Limit** | 1 ride per driver | 1 ride per driver **across ALL services** | **CRITICAL** — Server-side Global Active Ride Lock required |
