# GOZIPP Existing Architecture Audit
**Document ID:** GOZIPP-AUDIT-01  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** STAGE 0 — Read-Only Architecture Audit  
**Status:** COMPLETE & VERIFIED AGAINST SOURCE CODE  
**Audit Date:** 2026-11-08  

---

## 1. Executive Architecture Summary

GOZIPP (formerly MyWin) is an operational urban mobility platform originally designed for Thailand's community motorcycle taxi network ("วินมอเตอร์ไซค์"). The repository is organized as a modern TypeScript monorepo governed by **Turborepo** and **npm workspaces**.

```
GOZIPP Monorepo
├── apps/
│   ├── mobile-driver/     # Driver Progressive Web App & Android App (Next.js 16 + Capacitor 8)
│   ├── web-passenger/     # Passenger Progressive Web App (Next.js 16 + React 18)
│   └── web-admin/         # Operations & Dispatch Command Center (Next.js 16 + Recharts)
├── packages/
│   ├── api/               # Central Backend Engine & Realtime Gateway (NestJS 10 + TypeORM)
│   ├── database/          # PostgreSQL Schema DDL & Supabase Reference Specs
│   ├── shared/            # Shared Types, Pricing Engine Config, Promos & DTO Constants
│   └── ui/                # Shared UI Components
```

---

## 2. Monorepo & Build System Evidence

### 2.1 Workspace Configuration
* **Root `package.json`:**
  * Workspaces: `["apps/*", "packages/*"]`
  * Package manager: `npm` (with `package-lock.json` v3)
  * Orchestrator: `turbo` (`^1.12.0`) via `turbo.json`
* **Root Build & Dev Pipeline (`package.json` L9-16):**
  * `npm run dev` → `turbo run dev`
  * `npm run build` → `turbo run build`
  * `npm run lint` → `turbo run lint`
  * Container scripts: `docker:build`, `docker:prod`, `db:backup`

### 2.2 Compilation Targets & Language Version
* **Node.js Target:** `>= 20.0.0` (Verified in `Dockerfile`, `DEPLOYMENT_HOSTINGER.md`, and dependencies such as `@google/genai`).
* **TypeScript:** `5.3.3` (root) / `5.9.3` (apps). Typechecking is coordinated across the monorepo via project references: `npx tsc -b --noEmit`.

---

## 3. Technology Stack Breakdown

| Layer | Technology | Version | Key Libraries & Drivers |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | NestJS | `10.0.0` | `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/websockets`, `@nestjs/throttler` |
| **Database ORM** | TypeORM | `0.3.19` | `pg` (`^8.11.3`), PostgreSQL PostGIS spatial drivers |
| **Realtime Gateway** | Socket.IO | `4.7.4` | `@nestjs/platform-socket.io`, `@socket.io/redis-adapter` (`^8.3.0`) |
| **Cache & State Store** | Redis | `ioredis 5.3.2` | In-memory key-value, Sorted Sets (Queues), GeoSets (`GEOADD`/`GEOPOS`), Pub/Sub |
| **Passenger Web App** | Next.js (App Router) | `16.2.4` | React `18.2.0`, Zustand `4.5.0`, Tailwind CSS `3.4.1`, Leaflet `1.9.4` |
| **Driver Mobile App** | Next.js + Capacitor | `16.2.4` | `@capacitor/core 8.3.4`, `@capacitor/android 8.3.4`, Zustand `4.5.0`, Leaflet `1.9.4` |
| **Admin Operations** | Next.js (App Router) | `16.2.4` | React `18.2.0`, Recharts `3.8.1`, Lucide React `0.312.0`, Bcryptjs |
| **Authentication** | Multi-tier Auth | Custom | Firebase Admin SDK (`13.0.0`), Passport JWT (`11.0.5`), Argon2id (`0.44.0`), WebAuthn (`13.3.1`) |

---

## 4. Backend Engine Architecture (`packages/api`)

### 4.1 Entry Point & Bootstrapping (`packages/api/main.ts`)
* **Global Configuration:**
  * Global API prefix: `app.setGlobalPrefix('api/v1')` (Line 113).
  * Hardened Security Headers: `helmet({ contentSecurityPolicy: ... })` (Line 55).
  * Payload Compression: `compression()` (Line 60).
  * Cookie Parser: `cookieParser()` for secure HttpOnly cookie reading (Line 63).
  * Global Validation: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` (Line 66).
  * Global Exception Handling: `AllExceptionsFilter` (Line 51).
  * Global Telemetry & Logging: `LoggingInterceptor` (Line 52) and `ResilienceInterceptor`.
  * Distributed Socket Gateway: `RedisIoAdapter` attached to Socket.IO when `REDIS_URL` is set (Lines 116-125).

### 4.2 Module Graph (`packages/api/app.module.ts`)
The application is unified under `AppModule` with modular domain services:
```
AppModule
├── AuthModule                 # Firebase verification, JWT issuance, Cookie handlers, WebAuthn
├── ConfigModule               # Global environment configuration (.env)
├── ThrottlerModule            # Rate-limiting guard (100 req/min/IP baseline)
├── JwtModule                  # RS256/HS256 token signing (1-hour access token lifecycle)
├── TypeOrmModule              # PostgreSQL pool connection (idleTimeout: 30s, max: 20 connections)
└── Domain Controllers & Services:
    ├── PassengerController    # Passenger profiles, OTP request/login, trips history
    ├── RideController         # Ride booking creation, ride status polling, cancellation, rating
    ├── DriverController       # Driver onboarding, documents upload, profile, queue status
    ├── TripController         # Trip acceptance, rejection, completion
    ├── AdminController        # Live fleet monitoring, queue overrides, driver approvals, financial ledger
    ├── CreditController       # Wallet point deductions, PromptPay top-ups, transaction logging
    ├── UploadController       # Multipart upload with MIME validation & S3/local storage
    ├── HealthController       # Health check probes (/api/v1/health)
    └── AppGateway             # Bidirectional Socket.IO Gateway for live tracking & dispatch
```

---

## 5. Frontend Client Architecture

### 5.1 Passenger Client (`apps/web-passenger`)
* **Routing Paradigm:** Next.js App Router.
  * Public Landing: `apps/web-passenger/src/app/page.tsx`
  * Passenger Mobile Shell: `apps/web-passenger/src/app/passenger/page.tsx`
* **State Management (`apps/web-passenger/src/stores/`):**
  * `authStore.ts`: Session state, phone, JWT token, PIN status, onboarding step.
  * `rideStore.ts`: `isSearching`, `activeDriver`, `myLocation`, `currentTripId`, `rideStatus`, `estimate`, `driverLocation`.
  * `uiStore.ts`: Active navigation tabs (`HOME`, `WALLET`, `HISTORY`, `ACTIVITY`, `PROFILE`), toast messages.
* **Service Communication:**
  * REST API: `apps/web-passenger/src/services/api.ts` (`apiFetch` with automatic credentials and base URL resolution).
  * Realtime: Primary via Socket.IO (`apps/web-passenger/src/services/socket.ts`), secondary fallback via Supabase Realtime SDK (`apps/web-passenger/src/lib/supabaseClient.ts`).

### 5.2 Driver Mobile Client (`apps/mobile-driver`)
* **Routing Paradigm:** Next.js App Router + Android Capacitor wrapper.
  * Driver Shell: `apps/mobile-driver/src/app/page.tsx` mounting `DriverApp.tsx` (150KB specialized component).
* **Driver High-Contrast UX:**
  * Outdoor high-contrast color palette (Dark Slate `bg-slate-950` with high-visibility neon accents).
  * Single-hand thumb-accessible action buttons: "เริ่มงาน (Go Online)", "รับงาน (Accept Job)", "ถึงจุดรับ (Arrived)", "เริ่มส่ง (Start Trip)", "จบทริป (Complete)".
  * Realtime Queue Widget displaying current Win position and Fair Queue Score.

### 5.3 Admin Command Center (`apps/web-admin`)
* **Routing Paradigm:** Next.js App Router.
  * Base layout: `apps/web-admin/src/components/admin/AdminShell.tsx`.
* **Sub-dashboards:**
  * `AdminQueueDashboard.tsx`: Win queue inspection and manual supervisor override.
  * `AdminRateDashboard.tsx`: Driver document verification and approval/rejection/reupload workflow.
  * `OperationsDashboard.tsx`: God-view fleet map, real-time driver locations, and live trip status.
  * `AuditLogViewer.tsx`: Immutable security audit trail with actor filtering.

---

## 6. Realtime Communication Architecture

### 6.1 Socket.IO Dispatch Hub (`packages/api/app.gateway.ts`)
* **Connection Lifecycle:**
  * Client connects with JWT token passed in `auth.token`, `Authorization: Bearer <token>`, or `access_token` cookie.
  * Connection joins private room: `user:${userId}`.
  * Admin accounts join room: `admin`.
  * Active trips join room: `trip:${tripId}`.
* **Key Event Catalog:**
  * `DRIVER_UPDATE_STATUS`: Driver announces status (`IDLE` / `OFFLINE`) and broadcasts GPS coordinates.
  * `DRIVER_LOCATION_UPDATE`: Driver broadcasts live movement updates to `trip:${tripId}`.
  * `RIDE_OFFER`: Gateway targets candidate driver with a 15-second countdown offer.
  * `TRIP_ACCEPT`: Driver accepts job; Gateway commits driver assignment, removes driver from Win queue, and informs passenger room.
  * `TRIP_STATUS_UPDATE`: Lifecycle broadcast (`ACCEPTED`, `DRIVER_ARRIVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
  * `STATE_RESTORED`: Automatic session re-hydration for mobile drivers and passengers upon socket reconnection.

---

## 7. Storage, Maps & External Dependencies

1. **Mapping & Routing (`packages/api/map.service.ts`):**
   * Uses Haversine spherical trigonometric calculation for distance and ETA estimation.
   * Integrates Google Maps Directions API when `GOOGLE_MAPS_API_KEY` is present, with mathematical fallback when offline.
2. **File & Document Storage (`packages/api/common/s3.service.ts` & `upload.controller.ts`):**
   * Supports AWS S3 bucket (`AWS_S3_BUCKET`) for production file storage.
   * Supports local directory fallback (`uploads/`) with strict MIME validation (JPEG, PNG, WebP, PDF) and non-executable response headers.
3. **SMS Gateway (`packages/api/sms.service.ts`):**
   * Master OTP: Firebase Phone Authentication.
   * Fallback OTP: ThaiBulkSMS REST API (`https://api-v2.thaibulksms.com/sms`).

---

## 8. Summary of Reusable vs. Modifiable Components

| Component | Status | Dual Mobility Reusability Assessment |
| :--- | :---: | :--- |
| **Authentication & Tokens** | Reusable | 100% reusable. Phone + PIN + JWT system requires no architectural changes. |
| **GPS & Map Infrastructure** | Reusable | 100% reusable. Live coordinates and Leaflet maps serve both MOTO and TAXI. |
| **Wallet & Points System** | Reusable | 100% reusable. 0% GP model and flat system fee deduct mechanics apply identically. |
| **Socket Gateway** | Extendable | 80% reusable. Needs service-type payload headers on dispatch and location updates. |
| **Fair Queue Service** | Fork/Extend | 40% reusable. Existing queue is Win-geofenced for bikes; Car Taxi requires cruising/roaming dispatch. |
| **Driver & Vehicle Model** | Extendable | Schema must be expanded to decouple vehicles (`driver_vehicles`) from `drivers`. |
| **Passenger Booking UI** | Extendable | Needs a top-level Dual Mobility selector (GOZIPP MOTO vs. GOZIPP TAXI). |
