# GOZIPP Stage 2.2 Pre-Migration Database Snapshot
**Document ID:** GOZIPP-STAGE-2-2-SNAPSHOT  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** STAGE 2 — Gate 2.2 Database Preparation  
**Target Environment:** Isolated Staging / Development  
**Date:** 2026-11-08  
**Result:** PASS  

---

## 1. Pre-Migration Baseline Schema State

Prior to executing Stage 2 migrations, the database schema contains the following verified tables:

| Table Name | Primary Key | Key Foreign Keys | Purpose | Pre-Migration Rows (Baseline) |
| :--- | :--- | :--- | :--- | :---: |
| `passengers` | `id` (UUID) | None | Passenger identity & point wallet | Active Baseline |
| `drivers` | `id` (UUID) | `station_id` $\rightarrow$ `stations` | Driver identity, legacy plate, status | Active Baseline |
| `trips` | `id` (UUID) | `passenger_id`, `driver_id` | Historical & active ride records | Active Baseline |
| `stations` | `id` (VARCHAR) | None | Physical motorcycle Win stations | 5 Seeded Wins |
| `invite_codes` | `code` (VARCHAR) | `station_id` $\rightarrow$ `stations` | Win registration invite tokens | 1 Seeded Code |
| `driver_documents` | `id` (UUID) | `driver_id` $\rightarrow$ `drivers` | Driver KYC documents | Active Baseline |
| `driver_preferences`| `id` (UUID) | `driver_id` $\rightarrow$ `drivers` | Driver shift/zone preferences | Active Baseline |
| `driver_training_statuses` | `id` (UUID) | `driver_id` $\rightarrow$ `drivers` | Driver onboarding training modules | Active Baseline |
| `wallet` | `id` (UUID) | `passenger_id` $\rightarrow$ `passengers` | Point balance store | Active Baseline |
| `wallet_transactions` | `id` (UUID) | `passenger_id`, `trip_id` | Top-up & deduction ledger | Active Baseline |
| `refresh_tokens` | `id` (UUID) | `user_id` | Multi-device auth tokens | Active Baseline |
| `passkey_credentials` | `id` (UUID) | `user_id` | WebAuthn credentials | Active Baseline |
| `audit_logs` | `id` (UUID) | None | Immutable admin audit trail | Active Baseline |
| `sos_events` | `id` (UUID) | `trip_id` | Emergency SOS triggers | Active Baseline |
| `promotions` | `id` (UUID) | None | Campaign discount rules | Active Baseline |
| `admins` | `id` (UUID) | None | Admin RBAC credentials & MFA | Active Baseline |

---

## 2. Integrity Checks Baseline

1. **Foreign Key Integrity:** 0 orphaned records across `trips`, `wallet`, and `driver_documents`.
2. **PostGIS Extensions:** `geometry(Point, 4326)` columns active on `stations.location`, `trips.pickup_location`, `trips.dest_location`, `drivers.last_known_location`.
3. **Legacy Columns to Preserve:**
   * `drivers.plate` (Holds motorcycle license plates)
   * `drivers.station_id` (Holds Win station foreign key)
   * `trips.status` (Enum values: `SEARCHING`, `SCHEDULED`, `ACCEPTED`, `DRIVER_ARRIVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `TIMEOUT_NO_DRIVER`)
