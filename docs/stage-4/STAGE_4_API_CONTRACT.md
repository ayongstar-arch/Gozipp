# GOZIPP DUAL MOBILITY PLATFORM — STAGE 4
## Gate B: API Contract & Interface Specification

**Document ID:** GOZIPP-STAGE-4-API-CONTRACT  
**Version:** 1.0  
**Status:** CONTRACT CERTIFIED  
**API Architect:** Antigravity AI Engineering Engine  
**Target Environment:** Development / Staging Isolation  
**Date:** 2026-11-08  

---

## 1. Executive Summary

This document specifies the technical interface contracts for the **Stage 4 Passenger Booking & Driver Operational Experience**.

All contracts enforce:
- Strict separation between **MOTO** and **TAXI** services.
- Protection of **Global Active Ride Lock (P0)**.
- Anti-spoofing and geofence verification for driver arrival.
- Idempotency protection against duplicate network submissions.
- Prohibition of payment capture.

---

## 2. Passenger REST APIs

### 2.1 Fare Estimation Endpoint

#### `POST /api/v1/passenger/fare-estimate`
Computes distance, ETA, and fare estimate prior to booking submission.

- **Headers:**
  - `Authorization: Bearer <jwt_token>`
  - `Content-Type: application/json`

- **Request Body (`FareEstimateRequestDto`):**
  ```json
  {
    "pickupLat": 13.7563,
    "pickupLng": 100.5018,
    "destLat": 13.7800,
    "destLng": 100.5400,
    "serviceType": "MOTO" // "MOTO" | "TAXI" | "PUBLIC_TAXI" | "PRIVATE_CAR_FOR_HIRE"
  }
  ```

- **Response (`200 OK` - MOTO):**
  ```json
  {
    "serviceType": "MOTO",
    "distanceKm": 4.2,
    "durationMins": 14,
    "estimatedFare": 2.0,
    "currency": "THB",
    "breakdown": {
      "driverCommissionRate": 0.0,
      "passengerSystemFee": 2.0,
      "description": "0% Driver Commission. 2 THB System Support Fee."
    },
    "isQuotationConfirmed": true,
    "requiresPoints": 2
  }
  ```

- **Response (`200 OK` - TAXI Internal Staging Mode):**
  ```json
  {
    "serviceType": "TAXI",
    "vehicleCategory": "PUBLIC_TAXI",
    "distanceKm": 4.2,
    "durationMins": 18,
    "estimatedFare": 65.0,
    "currency": "THB",
    "breakdown": {
      "baseFare": 35.0,
      "distanceFare": 30.0,
      "note": "Internal Staging Simulation — No Actual Charge"
    },
    "isQuotationConfirmed": false,
    "isTestingQuotation": true,
    "disclaimer": "GOZIPP TAXI is currently in staging certification. Public bookings will be activated soon."
  }
  ```

---

### 2.2 Idempotent Ride Request Endpoint

#### `POST /api/v1/passenger/ride/request`
Creates a trip record and atomic outbox dispatch event.

- **Headers:**
  - `Authorization: Bearer <jwt_token>`
  - `Idempotency-Key: <UUIDv4>` (Mandatory for client retries)
  - `Content-Type: application/json`

- **Request Body (`RideRequestDto`):**
  ```json
  {
    "pickupLat": 13.7563,
    "pickupLng": 100.5018,
    "pickupAddress": "Siam Paragon, Bangkok",
    "destLat": 13.7800,
    "destLng": 100.5400,
    "destAddress": "Chatuchak Market, Bangkok",
    "serviceType": "MOTO", // "MOTO" | "TAXI"
    "preferredDriverId": null,
    "scheduledAt": null,
    "isEmergency": false
  }
  ```

- **Success Response (`201 Created` / `200 OK` on duplicate submission):**
  ```json
  {
    "tripId": "7d9b43e8-5b4d-4a12-8e7c-9b43e85b4d4a",
    "correlationId": "corr-7d9b43e8-5b4d-4a12",
    "status": "SEARCHING",
    "serviceType": "MOTO",
    "fare": 2.0,
    "distance": "4.2 กม.",
    "eta": "14 นาที",
    "createdAt": "2026-11-08T16:45:00.000Z"
  }
  ```

- **Error Responses:**
  - `400 Bad Request` (TAXI Public Booking Disabled):
    ```json
    {
      "statusCode": 400,
      "error": "Bad Request",
      "message": "บริการ GOZIPP TAXI ยังไม่เปิดให้บริการสาธารณะในขณะนี้ (อยู่ระหว่างการทดสอบระบบ)"
    }
    ```
  - `400 Bad Request` (Invalid Coordinates):
    ```json
    {
      "statusCode": 400,
      "error": "Bad Request",
      "message": "พิกัดจุดรับหรือจุดส่งไม่ถูกต้อง"
    }
    ```

---

## 3. Driver REST & WebSocket APIs

### 3.1 Driver Arrival Verification Endpoint

#### `POST /api/v1/driver/trips/:tripId/arrive`
Verifies driver proximity to pickup coordinates prior to transitioning trip state to `DRIVER_ARRIVED`.

- **Headers:**
  - `Authorization: Bearer <driver_jwt>`
  - `Content-Type: application/json`

- **Request Body (`DriverArrivalDto`):**
  ```json
  {
    "lat": 13.7562,
    "lng": 100.5019,
    "accuracyMeters": 12.5,
    "clientTimestamp": 1794156500000
  }
  ```

- **Response (`200 OK` - Geofence Verified):**
  ```json
  {
    "tripId": "7d9b43e8-5b4d-4a12-8e7c-9b43e85b4d4a",
    "status": "DRIVER_ARRIVED",
    "arrivalVerified": true,
    "distanceToPickupMeters": 21.4,
    "gpsAccuracyMeters": 12.5,
    "verificationStatus": "VERIFIED",
    "arrivedAt": "2026-11-08T16:46:12.000Z"
  }
  ```

- **Response (`200 OK` - Unverified Location Warning):**
  ```json
  {
    "tripId": "7d9b43e8-5b4d-4a12-8e7c-9b43e85b4d4a",
    "status": "DRIVER_ARRIVED",
    "arrivalVerified": false,
    "distanceToPickupMeters": 185.0,
    "gpsAccuracyMeters": 85.0,
    "verificationStatus": "LOCATION_UNVERIFIED",
    "warningMessage": "GPS accuracy is low or distance exceeds 100m. Marked as unverified arrival.",
    "arrivedAt": "2026-11-08T16:46:12.000Z"
  }
  ```

- **Error Response (`400 Bad Request`):**
  ```json
  {
    "statusCode": 400,
    "message": "ไม่สามารถเปลี่ยนสถานะเป็น DRIVER_ARRIVED ได้ เนื่องจากสถานะปัจจุบันไม่ใช่ ACCEPTED"
  }
  ```

---

## 4. WebSocket Event Contracts (Socket.IO)

### 4.1 Server to Driver: Incoming Ride Offers
- **Channel / Room:** `user:<driverId>`
- **Event Name:** `TAXI_RIDE_OFFER` (for TAXI) / `RIDE_OFFER` (for MOTO)
- **Payload:**
  ```json
  {
    "offer": {
      "offerId": "offer-7d9b43e8-drv1-1794156500000",
      "tripId": "7d9b43e8-5b4d-4a12-8e7c-9b43e85b4d4a",
      "driverId": "drv-uuid-1",
      "round": 1,
      "radiusKm": 1.5,
      "timeoutSeconds": 15,
      "expiresAt": 1794156515000
    },
    "trip": {
      "id": "7d9b43e8-5b4d-4a12-8e7c-9b43e85b4d4a",
      "serviceType": "TAXI",
      "vehicleCategory": "PUBLIC_TAXI",
      "pickup": {
        "lat": 13.7563,
        "lng": 100.5018,
        "address": "Siam Paragon, Bangkok"
      },
      "destination": {
        "lat": 13.7800,
        "lng": 100.5400,
        "address": "Chatuchak Market, Bangkok"
      },
      "distanceKm": 4.2,
      "fare": 65.0,
      "passengerName": "สมชาย (ผู้โดยสาร)"
    },
    "expiresInSeconds": 15
  }
  ```

### 4.2 Driver to Server: Offer Responses
- **Event Name:** `TAXI_OFFER_ACCEPT`
  - **Payload:** `{ "offerId": "offer-7d9b43e8-drv1-...", "tripId": "7d9b43e8-..." }`
  - **Server Processing:** Validates offer expiration, acquires Global Active Ride Lock (`driver_active_assignments`), sets trip `driver_id` and status `ACCEPTED`.
- **Event Name:** `TAXI_OFFER_REJECT`
  - **Payload:** `{ "offerId": "offer-7d9b43e8-drv1-...", "tripId": "7d9b43e8-..." }`
  - **Server Processing:** Increments driver consecutive rejection count, releases offer, dispatches to next candidate.

### 4.3 Trip Status Broadcasts
- **Channel / Room:** `trip:<tripId>`
- **Event Name:** `TRIP_STATUS_UPDATE`
- **Payload:**
  ```json
  {
    "tripId": "7d9b43e8-5b4d-4a12-8e7c-9b43e85b4d4a",
    "status": "DRIVER_ARRIVED",
    "serviceType": "TAXI",
    "arrivalVerified": true,
    "verificationStatus": "VERIFIED",
    "timestamp": "2026-11-08T16:46:12.000Z"
  }
  ```
