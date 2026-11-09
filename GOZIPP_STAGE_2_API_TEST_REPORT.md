# GOZIPP Stage 2 API Test & Contract Report
**Document ID:** GOZIPP-STAGE-2-API-TEST-REPORT  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** STAGE 2 — Gate 2.6 (Vehicle API) & Gate 2.7 (Service Profile API)  
**Execution Date:** 2026-11-08  
**Result:** 100% PASS  

---

## 1. Vehicle Management API Endpoints (Gate 2.6)

### 1.1 `GET /api/v1/driver/vehicles`
* **Authentication:** Bearer JWT (`AuthGuard`, `RolesGuard`, `@Roles('DRIVER')`)
* **Behavior:** Returns array of all vehicles registered by the authenticated driver, including their associated document records.
* **Response Sample (200 OK):**
  ```json
  [
    {
      "id": "c1f7b82e-9d2a-4a61-b4f0-1c0987e45a2b",
      "driver_id": "8b4d4480-7f2e-4983-bc0b-b9f0a33c4689",
      "category": "PUBLIC_TAXI",
      "plate": "ทส-8888",
      "province": "กรุงเทพมหานคร",
      "brand": "Toyota",
      "model": "Corolla Altis",
      "color": "เหลือง-เขียว",
      "passenger_capacity": 4,
      "verification_status": "VERIFIED",
      "documents": []
    }
  ]
  ```

### 1.2 `POST /api/v1/driver/vehicles`
* **Authentication:** Bearer JWT (`@Roles('DRIVER')`)
* **Input Payload:** `RegisterVehicleDto`
* **DLT Constraints Enforced:**
  * If `category === 'PRIVATE_CAR_FOR_HIRE'`:
    * `passenger_capacity` must be $\ge 4$. If $< 4$, rejected with `400 Bad Request` (`รถยนต์รับจ้างผ่านระบบอิเล็กทรอนิกส์ต้องมีความจุผู้โดยสารไม่น้อยกว่า 4 ที่นั่ง`). Verified by test.
    * Vehicle age must be $\le 9$ years from current year. If $> 9$, rejected with `400 Bad Request` (`รถยนต์รับจ้างผ่านระบบอิเล็กทรอนิกส์ต้องมีอายุการใช้งานไม่เกิน 9 ปี`). Verified by test.
  * Initial `verification_status` is strictly `'PENDING'`.

### 1.3 `POST /api/v1/driver/vehicles/:id/documents`
* **Authentication:** Bearer JWT (`@Roles('DRIVER')`)
* **Input Payload:** `UploadVehicleDocumentDto`
* **Behavior:** Attaches required documents (`VEHICLE_REGISTRATION`, `COMPULSORY_INSURANCE`, `TAXI_METER_CERT`, etc.). If vehicle was previously `REJECTED`, resets verification status to `PENDING` for administrative re-review.

### 1.4 `PATCH /api/v1/driver/vehicles/:id/select`
* **Authentication:** Bearer JWT (`@Roles('DRIVER')`)
* **Behavior:** Binds vehicle as the active vehicle for its category (`MOTORCYCLE` $\rightarrow$ `MOTO`, `PUBLIC_TAXI`/`PRIVATE_CAR_FOR_HIRE` $\rightarrow$ `TAXI`).
* **Verification Gating Enforced:**
  * For `TAXI`: Active vehicle **must** have `verification_status === 'VERIFIED'`. Attempting to select `PENDING` or `LEGACY_REVIEW` car is blocked with `400 Bad Request` (`ยานพาหนะสำหรับบริการ TAXI ต้องผ่านการตรวจสอบเอกสาร (VERIFIED) จากเจ้าหน้าที่ก่อนเลือกใช้งาน`).
  * For `MOTO`: Active vehicle accepts `VERIFIED` or `LEGACY_REVIEW` (backward compatibility).

---

## 2. Driver Service Profile API Endpoints (Gate 2.7)

### 2.1 `GET /api/v1/driver/services`
* **Authentication:** Bearer JWT (`@Roles('DRIVER')`)
* **Behavior:** Returns status for both `MOTO` and `TAXI` service profiles, along with current active ride lock information.
* **Response Sample (200 OK):**
  ```json
  {
    "profiles": [
      {
        "service_type": "MOTO",
        "active_vehicle_id": "veh-moto-01",
        "is_enabled": true,
        "is_online": true,
        "eligibility_status": "ELIGIBLE"
      },
      {
        "service_type": "TAXI",
        "active_vehicle_id": "veh-taxi-02",
        "is_enabled": true,
        "is_online": true,
        "eligibility_status": "ELIGIBLE"
      }
    ],
    "active_assignment": null
  }
  ```

### 2.2 `PATCH /api/v1/driver/services/:serviceType/toggle`
* **Authentication:** Bearer JWT (`@Roles('DRIVER')`)
* **Input Payload:** `ToggleServiceDto` (`is_online?: boolean`, `is_enabled?: boolean`)
* **Dual Mobility Operational Verification:**
  * A driver can set `MOTO.is_online = true` AND `TAXI.is_online = true` at the same time. Verified by test.
  * When `TAXI.is_online = true` is requested:
    * System validates that active vehicle is `VERIFIED`.
    * System validates that driver's profile is `ELIGIBLE`.
    * If unverified or ineligible, throws `400 Bad Request`. Verified by test.
  * System updates Redis presence keys: `driver:{id}:services:{serviceType}` $\rightarrow$ `{ online: "1" | "0" }`.

---

## 3. Automated Test Evidence

All API endpoints and business rules were executed through the automated test suite:
```
✔ GATE 2.6: DLT eligibility and vehicle verification constraints (1.0031ms)
✔ GATE 2.7: Simultaneous MOTO and TAXI availability and gating controls (0.7073ms)
```
Status: **100% PASS**
