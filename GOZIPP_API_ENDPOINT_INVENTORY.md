# GOZIPP API Endpoint Inventory
**Document ID:** GOZIPP-AUDIT-03  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** STAGE 0 — Read-Only API Endpoint Inventory  
**Status:** COMPLETE & VERIFIED AGAINST SOURCE CODE  
**Audit Date:** 2026-11-08  

---

## 1. Global API Configuration

* **Base URL Prefix:** All REST endpoints are prefixed with `/api/v1` via `app.setGlobalPrefix('api/v1')` in [`packages/api/main.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/main.ts#L113).
* **Security & Guards:**
  * `AuthGuard`: Validates JWT token from HttpOnly cookie `access_token` or `Authorization: Bearer <token>`.
  * `RolesGuard`: Enforces role-based permissions specified via `@Roles(...)`.
  * `ThrottlerGuard`: Protects against brute-force attacks and abuse.

---

## 2. Passenger API Endpoints (`packages/api/passenger.controller.ts`)

| HTTP Method | Route | Auth / Roles | Request DTO / Params | Response Shape | Source Reference | Dual Mobility Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/passenger/pricing-config` | Public | None | `{ baseFarePoints: number, emergencyOverdraftLimit: number }` | `passenger.controller.ts` L27 | Must be extended to return pricing per service (`MOTO` vs. `TAXI`). |
| **POST** | `/api/v1/passenger/otp` | Public (Throttled) | `PassengerRequestOtpDto` (`phoneNumber`) | `{ success: boolean, message: string, expiresInSeconds: number }` | `passenger.controller.ts` L33 | None. Shared passenger auth. |
| **POST** | `/api/v1/passenger/login` | Public | `PassengerVerifyOtpDto` (`phoneNumber`, `otp`) | `{ isRegistered: boolean, accessToken?: string, passengerId?: string }` | `passenger.controller.ts` L48 | None. Shared passenger auth. |
| **POST** | `/api/v1/passenger/register` | Public | `PassengerRegisterDto` (`phoneNumber`, `name`, `otp?`, `referralCode?`) | `{ success: boolean, passengerId: string, accessToken: string }` | `passenger.controller.ts` L59 | None. Shared passenger auth. |
| **GET** | `/api/v1/passenger/me` | JWT (`PASSENGER`) | None (from JWT sub) | `{ success: true, user: { id, name, phone, pointsBalance, freeRidesRemaining } }` | `passenger.controller.ts` L77 | None. |
| **GET** | `/api/v1/passenger/profile` | JWT (`PASSENGER`) | None | `{ id, name, phone, email, pointsBalance, totalRides, avatarUrl }` | `passenger.controller.ts` L97 | None. |
| **GET** | `/api/v1/passenger/trips` | JWT (`PASSENGER`) | `page`, `limit` | `{ trips: TripSummary[], total: number, page: number, pages: number }` | `passenger.controller.ts` L105 | Extend `TripSummary` to include `serviceType`, vehicle model and plate. |
| **GET** | `/api/v1/passenger/drivers/search` | Public | `q: string` | `DriverPublicSummary[]` | `passenger.controller.ts` L121 | Filter by service type or show vehicle class. |

---

## 3. Ride Booking Endpoints (`packages/api/passenger.controller.ts` -> `RideController`)

| HTTP Method | Route | Auth / Roles | Request DTO / Params | Response Shape | Source Reference | Dual Mobility Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/passenger/ride/request` | JWT (`PASSENGER`) | `RideRequestDto` (`pickupLat`, `pickupLng`, `destLat`, `destLng`, `pickupAddress`, `destAddress`, `isEmergency?`, `scheduledAt?`, `preferredDriverId?`) | `{ tripId, status, fare, distance, eta, scheduledAt? }` | `passenger.controller.ts` L141 | **CRITICAL GAP:** Must add optional `serviceType: 'MOTO' \| 'TAXI'` (defaulting to `'MOTO'`). |
| **GET** | `/api/v1/passenger/ride/:tripId/status` | JWT (`PASSENGER`) | `tripId: string` | `{ tripId, status, driverId, driver: { id, name, plate, phone, rating }, scheduledAt }` | `passenger.controller.ts` L162 | Extend `driver` to return vehicle details (`brand`, `model`, `color`, `vehicleClassification`). |
| **POST** | `/api/v1/passenger/ride/:tripId/cancel` | JWT (`PASSENGER`) | `tripId: string` | `{ success: boolean, message: string }` | `passenger.controller.ts` L170 | Shared lifecycle. Releases global active lock. |
| **POST** | `/api/v1/passenger/ride/:tripId/rate` | JWT (`PASSENGER`) | `tripId: string`, body: `{ rating: number, note?: string }` | `{ success: boolean }` | `passenger.controller.ts` L179 | Shared lifecycle. Recalculates driver average rating. |

---

## 4. Driver API Endpoints (`packages/api/driver.controller.ts`)

| HTTP Method | Route | Auth / Roles | Request DTO / Params | Response Shape | Source Reference | Dual Mobility Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/driver/register` | Public | `DriverRegisterDto` (`phoneNumber`, `fullName`, `licensePlate`, `inviteCode`) | `{ success: boolean, driverId: string }` | `driver.controller.ts` L18 | Initial registration creates driver. Multi-vehicle additions happen in dedicated endpoints. |
| **GET** | `/api/v1/driver/profile` | JWT (`DRIVER`) | None | `{ id, name, phone, plate, stationId, currentStatus, approvalStatus, rating, totalTrips }` | `driver.controller.ts` L23 | Extend to return `services: { MOTO: boolean, TAXI: boolean }` and list of `vehicles`. |
| **GET** | `/api/v1/driver/trips` | JWT (`DRIVER`) | `page`, `limit`, `status?` | `{ trips: DriverTripItem[], total, page, pages }` | `driver.controller.ts` L30 | Include `serviceType` on each trip item. |
| **POST** | `/api/v1/driver/online` | JWT (`DRIVER`) | `DriverOnlineDto` (`lat`, `lng`) | `{ status: 'QUEUED' \| 'ROAMING', winId?, message }` | `driver.controller.ts` L47 | Must support enabling specific service (`serviceType?: 'MOTO' \| 'TAXI'`). |
| **GET** | `/api/v1/driver/queue-status` | JWT (`DRIVER`) | None | `{ status, winId, winName, position, totalDrivers, score }` | `driver.controller.ts` L54 | Returns MOTO Win queue status. If TAXI is enabled, returns Taxi roaming status. |
| **POST** | `/api/v1/driver/onboarding/profile` | Public / Driver | `UpdateDriverProfileDto` | `{ success: boolean }` | `driver.controller.ts` L64 | Extends driver personal information. |
| **POST** | `/api/v1/driver/onboarding/document` | Public / Driver | `UploadDriverDocumentDto` (`driverId`, `type`, `url`) | `{ success: boolean, docId: string }` | `driver.controller.ts` L69 | Extend to accept `vehicleId?` for vehicle-specific documents. |
| **POST** | `/api/v1/driver/onboarding/preferences`| Public / Driver | `SaveDriverPreferencesDto` | `{ success: boolean }` | `driver.controller.ts` L74 | Allows toggling MOTO / TAXI in preferences. |

---

## 5. Driver Trip Action Endpoints (`packages/api/driver.controller.ts` -> `TripController`)

| HTTP Method | Route | Auth / Roles | Request DTO / Params | Response Shape | Source Reference | Dual Mobility Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/trip/accept` | JWT (`DRIVER`) | `TripActionDto` (`tripId`) | `{ success: boolean, passengerId, driver }` | `driver.controller.ts` L100 | **ENFORCES GLOBAL LOCK:** Validates driver has NO active ride across MOTO and TAXI. |
| **POST** | `/api/v1/trip/reject` | JWT (`DRIVER`) | `TripActionDto` (`tripId`) | `{ success: boolean }` | `driver.controller.ts` L108 | Penalizes MOTO queue or releases TAXI offer without queue impact. |
| **POST** | `/api/v1/trip/complete` | JWT (`DRIVER`) | `TripActionDto` (`tripId`) | `{ success: boolean }` | `driver.controller.ts` L114 | **RELEASES GLOBAL LOCK:** Allows driver to receive new jobs across all enabled services. |

---

## 6. Admin API Endpoints (`packages/api/admin.controller.ts`)

| HTTP Method | Route | Auth / Roles | Parameters | Purpose & Code Reference | Dual Mobility Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/admin/drivers` | `ADMIN` | `search`, `status`, `page`, `limit` | Query all registered drivers (`admin.controller.ts` L109) | Displays driver's registered vehicles and approved service profiles. |
| **POST** | `/api/v1/admin/drivers/status` | `ADMIN` | `{ driverId, status }` | Suspend or activate driver (`admin.controller.ts` L125) | Suspending driver suspends both MOTO and TAXI permissions. |
| **GET** | `/api/v1/admin/drivers/pending` | `ADMIN` | None | Fetch pending driver applications (`admin.controller.ts` L345) | Filter pending applications by vehicle type (Motorcycle vs. Car Taxi). |
| **POST** | `/api/v1/admin/drivers/approve` | `ADMIN` | `{ driverId }` | Approve driver (`admin.controller.ts` L351) | Must support approving specific vehicle / service profile. |
| **POST** | `/api/v1/admin/drivers/reject` | `ADMIN` | `{ driverId, reason }` | Reject driver application (`admin.controller.ts` L369) | Logs reason in audit trail. |
| **GET** | `/api/v1/admin/fleet/live` | `ADMIN` | None | Real-time God-view fleet map (`admin.controller.ts` L197) | Displays vehicle icons based on active vehicle class (Bike vs. Car). |
| **GET** | `/api/v1/admin/finance/ledger` | `ADMIN` | `limit` | Double-entry zero-commission ledger (`admin.controller.ts` L337) | Adds service type breakdown (`MOTO` vs. `TAXI`). |
| **GET** | `/api/v1/admin/audit-logs` | `SECURITY`, `SUPER` | `action`, `actorId`, `startDate`, `page` | Query immutable audit log (`admin.controller.ts` L498) | Audits all document verification and vehicle approval actions. |

---

## 7. WebSocket Event Protocol (`packages/api/app.gateway.ts`)

| Event Name | Direction | Payload | Gateway Handler | Dual Mobility Behavior |
| :--- | :---: | :--- | :--- | :--- |
| `DRIVER_UPDATE_STATUS` | Client → Server | `{ status: 'IDLE' \| 'OFFLINE', location: { lat, lng } }` | `handleDriverStatus` L192 | If driver has MOTO enabled, joins Win queue. If TAXI enabled, updates roaming GeoSet. |
| `DRIVER_LOCATION_UPDATE` | Client → Server | `{ lat, lng, heading? }` | `handleDriverLocation` L212 | Broadcasts location to `trip:${tripId}` room with vehicle coordinate telemetry. |
| `RIDE_OFFER` | Server → Client | `{ trip, expiresInSeconds: 15 }` | Emitted from `offerTripToNextDriver` L99 | Payload specifies `serviceType: 'MOTO' \| 'TAXI'` and requested passenger route. |
| `TRIP_ACCEPT` | Client → Server | `{ tripId }` | `handleTripAccept` L223 | Commits assignment atomically. Validates Global Active Ride Lock. |
| `TRIP_STATUS_UPDATE` | Server → Client | `{ tripId, status, driver }` | Broadcast to `trip:${tripId}` | Updates passenger and driver state machines synchronously. |
| `TRIP_JOIN_ROOM` | Client → Server | `{ tripId }` | Passenger/Driver socket joins room | Connects client to trip room for live chat, telemetry, and lifecycle events. |
| `STATE_RESTORED` | Server → Client | `{ type: 'ACTIVE_TRIP', trip }` | Automatic on `handleConnection` L144 | Restores active ride upon app reconnection across any service type. |

---

## 8. New Endpoints Required for Dual Mobility

To avoid breaking existing endpoints, the following new REST endpoints will be introduced in Stage 2/3:
1. `GET /api/v1/driver/vehicles`: List all registered vehicles for the authenticated driver.
2. `POST /api/v1/driver/vehicles`: Register a new vehicle (`MOTORCYCLE`, `PUBLIC_TAXI`, or `PRIVATE_CAR_FOR_HIRE`).
3. `POST /api/v1/driver/vehicles/:vehicleId/documents`: Upload vehicle-specific compliance documents (vehicle registration, inspection certificate, commercial insurance).
4. `PATCH /api/v1/driver/services/:serviceType/toggle`: Independently enable/disable `MOTO` or `TAXI` availability.
5. `GET /api/v1/admin/vehicles/pending`: Admin queue for pending car taxi verification documents.
6. `POST /api/v1/admin/vehicles/:vehicleId/verify`: Admin decision endpoint for approving or rejecting a vehicle.
