# GOZIPP Dual Mobility API & Event Contract
**Document ID:** GOZIPP-API-01  
**Project:** GOZIPP Dual Mobility Platform (MOTO + TAXI)  
**Stage:** STAGE 1 — Technical Contract Design  
**Status:** DRAFTED FOR APPROVAL  
**Protocol:** REST HTTP + WebSocket (Socket.IO 4.7.4)  
**Date:** 2026-11-08  

---

## 1. Global Standards & Conventions

1. **Base Prefix:** All REST routes are prefixed with `/api/v1`.
2. **Security & Session:**
   * Session authentication is read primarily from the HttpOnly cookie `access_token`, with fallback to `Authorization: Bearer <token>`.
   * Enforced via `AuthGuard` and role-based validation `RolesGuard` (`@Roles(...)`).
3. **Data Representation:**
   * All timestamps are ISO 8601 UTC strings (e.g. `2026-11-08T15:30:00.000Z`).
   * Geographic coordinates are numbers formatted as `lat: number` ([-90, 90]) and `lng: number` ([-180, 180]).
   * Currency/points are numbers with 2 decimal places.

---

## 2. Passenger Service Endpoints

### 2.1 Request Ride Booking
* **Method & Path:** `POST /api/v1/passenger/ride/request`
* **Guard & Role:** `@UseGuards(AuthGuard, RolesGuard)` with `@Roles('PASSENGER')`
* **Request DTO (`RideRequestDto`):**
```typescript
export class RideRequestDto {
  @IsEnum(['MOTO', 'TAXI'], { message: 'serviceType must be MOTO or TAXI' })
  @IsOptional()
  serviceType?: 'MOTO' | 'TAXI' = 'MOTO'; // Default: MOTO (Back-compat)

  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLng: number;

  @IsString()
  @IsNotEmpty()
  pickupAddress: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  destLat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  destLng: number;

  @IsString()
  @IsNotEmpty()
  destAddress: string;

  @IsBoolean()
  @IsOptional()
  isEmergency?: boolean = false;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsString()
  @IsOptional()
  preferredDriverId?: string;

  @IsEnum(['ANY', 'PUBLIC_TAXI', 'PRIVATE_CAR_FOR_HIRE'])
  @IsOptional()
  taxiPreference?: 'ANY' | 'PUBLIC_TAXI' | 'PRIVATE_CAR_FOR_HIRE' = 'ANY';
}
```
* **Success Response (`201 Created`):**
```json
{
  "success": true,
  "tripId": "d3b07384-d113-4f9e-a89e-4a413d789012",
  "serviceType": "TAXI",
  "status": "SEARCHING",
  "fare": 185.00,
  "systemFeePoints": 2.00,
  "distance": "7.4 กม.",
  "eta": "16 นาที",
  "searchRadiusKm": 1.5
}
```
* **Error Responses:**
  * `400 Bad Request`: `{ "statusCode": 400, "message": "แต้มไม่เพียงพอ กรุณาเติมแต้ม หรือเลือกใช้งานฉุกเฉิน" }`
  * `422 Unprocessable Entity`: Input validation failure.

---

### 2.2 Get Real-time Ride Status
* **Method & Path:** `GET /api/v1/passenger/ride/:tripId/status`
* **Guard & Role:** `@UseGuards(AuthGuard, RolesGuard)` with `@Roles('PASSENGER')`
* **Success Response (`200 OK`):**
```json
{
  "tripId": "d3b07384-d113-4f9e-a89e-4a413d789012",
  "serviceType": "TAXI",
  "status": "ACCEPTED",
  "driverId": "b0000000-0000-0000-0000-000000000001",
  "driver": {
    "id": "b0000000-0000-0000-0000-000000000001",
    "name": "สมชาย ไรเดอร์",
    "phone": "0812345678",
    "rating": 4.95
  },
  "vehicle": {
    "plate": "1มค-4567",
    "classification": "PUBLIC_TAXI",
    "make": "Toyota",
    "model": "Corolla Altis",
    "color": "เขียว-เหลือง",
    "manufacturingYear": 2022
  },
  "scheduledAt": null
}
```

---

## 3. Driver Vehicle & Availability Endpoints

### 3.1 List Registered Vehicles
* **Method & Path:** `GET /api/v1/driver/vehicles`
* **Guard & Role:** `@UseGuards(AuthGuard, RolesGuard)` with `@Roles('DRIVER')`
* **Success Response (`200 OK`):**
```json
{
  "vehicles": [
    {
      "id": "v1000000-0000-0000-0000-000000000001",
      "plate": "1กข-9999",
      "vehicleClassification": "MOTORCYCLE",
      "make": "Honda",
      "model": "Wave 125i",
      "color": "แดง-ดำ",
      "verificationStatus": "LEGACY_REVIEW",
      "isActive": true
    },
    {
      "id": "v2000000-0000-0000-0000-000000000002",
      "plate": "1มค-4567",
      "vehicleClassification": "PUBLIC_TAXI",
      "make": "Toyota",
      "model": "Corolla Altis",
      "color": "เขียว-เหลือง",
      "verificationStatus": "VERIFIED",
      "isActive": true
    }
  ]
}
```

---

### 3.2 Register New Vehicle
* **Method & Path:** `POST /api/v1/driver/vehicles`
* **Guard & Role:** `@UseGuards(AuthGuard, RolesGuard)` with `@Roles('DRIVER')`
* **Request DTO (`RegisterVehicleDto`):**
```typescript
export class RegisterVehicleDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  plate: string;

  @IsEnum(['MOTORCYCLE', 'PUBLIC_TAXI', 'PRIVATE_CAR_FOR_HIRE'])
  vehicleClassification: 'MOTORCYCLE' | 'PUBLIC_TAXI' | 'PRIVATE_CAR_FOR_HIRE';

  @IsString()
  @IsNotEmpty()
  make: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsInt()
  @Min(2005)
  @Max(2027)
  manufacturingYear: number;
}
```
* **Success Response (`201 Created`):**
```json
{
  "success": true,
  "vehicleId": "v3000000-0000-0000-0000-000000000003",
  "verificationStatus": "PENDING",
  "message": "ลงทะเบียนรถเรียบร้อยแล้ว กรุณาอัปโหลดเอกสารเพื่อรอการอนุมัติ"
}
```

---

### 3.3 Upload Vehicle Compliance Document
* **Method & Path:** `POST /api/v1/driver/vehicles/:id/documents`
* **Guard & Role:** `@UseGuards(AuthGuard, RolesGuard)` with `@Roles('DRIVER')`
* **Request DTO (`UploadVehicleDocDto`):**
```typescript
export class UploadVehicleDocDto {
  @IsEnum([
    'REGISTRATION_BOOK',
    'VEHICLE_INSPECTION',
    'COMPULSORY_INSURANCE',
    'COMMERCIAL_INSURANCE',
    'DLT_STICKER',
    'TAXI_METER_CERTIFICATE',
    'YELLOW_LICENSE_PLATE'
  ])
  documentType: string;

  @IsUrl()
  url: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;
}
```
* **Success Response (`201 Created`):**
```json
{
  "success": true,
  "documentId": "doc-uuid-1234",
  "status": "PENDING"
}
```

---

### 3.4 Multi-Service Availability Toggle
* **Method & Path:** `PATCH /api/v1/driver/services/:serviceType/toggle`
* **Guard & Role:** `@UseGuards(AuthGuard, RolesGuard)` with `@Roles('DRIVER')`
* **Request Body:** `{ "enabled": boolean, "vehicleId"?: string }`
* **Business Validation Rule:**
  * Cannot enable a service if the associated vehicle is not `VERIFIED` (or `LEGACY_REVIEW` for MOTO).
  * Cannot change availability while holding an active ride.
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "serviceType": "TAXI",
  "isEnabled": true,
  "activeVehicleId": "v2000000-0000-0000-0000-000000000002",
  "availabilityStatus": "ONLINE_IDLE"
}
```

---

## 4. Driver Trip Action Endpoints

### 4.1 Accept Trip (Global Active Ride Lock Enforcement)
* **Method & Path:** `POST /api/v1/trip/accept`
* **Guard & Role:** `@UseGuards(AuthGuard, RolesGuard)` with `@Roles('DRIVER')`
* **Request DTO (`TripActionDto`):** `{ "tripId": string }`
* **Backend Atomic Enforcement:**
  * Checks and acquires `driver_active_assignments` row in PostgreSQL.
  * If driver holds an active lock on ANY service, rejects with HTTP 409 Conflict.
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "tripId": "d3b07384-d113-4f9e-a89e-4a413d789012",
  "passengerId": "a0000000-0000-0000-0000-000000000001",
  "serviceType": "TAXI",
  "status": "ACCEPTED"
}
```
* **Conflict Response (`409 Conflict`):**
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "ท่านมีงานที่กำลังดำเนินการอยู่แล้ว ไม่สามารถรับงานซ้อนได้"
}
```

---

## 5. Admin Legal Verification Endpoints

### 5.1 Query Pending Vehicles for Verification
* **Method & Path:** `GET /api/v1/admin/vehicles/pending`
* **Guard & Role:** `@UseGuards(AuthGuard, RolesGuard)` with `@Roles('ADMIN', 'SUPERADMIN')`
* **Query Parameters:** `classification?: string`, `page?: number`, `limit?: number`
* **Success Response (`200 OK`):** Returns array of pending vehicles with attached documents and driver details.

### 5.2 Approve or Reject Vehicle Verification
* **Method & Path:** `POST /api/v1/admin/vehicles/:id/verify`
* **Guard & Role:** `@UseGuards(AuthGuard, RolesGuard)` with `@Roles('ADMIN', 'SUPERADMIN')`
* **Request Body:**
```typescript
export class VerifyVehicleDecisionDto {
  @IsEnum(['VERIFIED', 'REJECTED', 'SUSPENDED'])
  decision: 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "vehicleId": "v2000000-0000-0000-0000-000000000002",
  "verificationStatus": "VERIFIED",
  "verifiedAt": "2026-11-08T22:00:00.000Z"
}
```
* **Audit Trail Integration:** Automatically creates an immutable log in `audit_logs` table (`action: 'VEHICLE_VERIFIED'`).

---

## 6. WebSocket Realtime Event Specifications (`AppGateway`)

| Event Name | Direction | Payload Interface | Description |
| :--- | :---: | :--- | :--- |
| `DRIVER_UPDATE_STATUS` | Client → Server | `{ lat: number, lng: number, services: { MOTO?: boolean, TAXI?: boolean } }` | Driver publishes live coordinates and toggles active services. |
| `RIDE_OFFER` | Server → Client | `{ tripId, serviceType, pickup: { lat, lng, address }, fare, expiresInSeconds: 15 }` | Targeted job offer sent to personal room `user:<driverId>`. |
| `TRIP_ACCEPT` | Client → Server | `{ tripId: string }` | Driver attempts atomic assignment acceptance. |
| `TRIP_STATUS_UPDATE` | Server → Client | `{ tripId: string, status: string, serviceType: string, driver?: object, vehicle?: object }` | Broadcast to `trip:${tripId}` room on every valid state transition. |
| `DRIVER_LOCATION_UPDATE` | Client → Server | `{ tripId: string, lat: number, lng: number, heading?: number }` | Driver streams live movement telemetry to assigned passenger. |
| `TRIP_COMPLETE` | Client → Server | `{ tripId: string }` | Driver confirms journey completion; triggers lock release. |
| `STATE_RESTORED` | Server → Client | `{ type: 'ACTIVE_TRIP', trip: object, lock: object }` | Client reconnects; server pushes authoritative active state. |
