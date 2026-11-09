# GOZIPP Deployment & Operations Audit
**Document ID:** GOZIPP-AUDIT-08  
**Project:** GOZIPP Dual Mobility Platform  
**Stage:** STAGE 0 — Read-Only Deployment & Operations Audit  
**Status:** COMPLETE & VERIFIED AGAINST SOURCE CODE  
**Audit Date:** 2026-11-08  

---

## 1. Hosting Architecture & Infrastructure

The GOZIPP deployment strategy supports two complementary environments:

```
                    ┌─────────────────────────────────┐
                    │       GitHub Repository         │
                    │   (ayongstar-arch/Gozipp.git)   │
                    └────────────────┬────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
       ┌────────────────────────┐        ┌────────────────────────┐
       │   Render.com Staging   │        │ Hostinger / Docker Prod│
       │   (Auto-deploy Branch) │        │ (Production Container) │
       │    render.yaml spec    │        │ Dockerfile + Compose   │
       └────────────────────────┘        └────────────────────────┘
                    │                                 │
                    ▼                                 ▼
       ┌────────────────────────┐        ┌────────────────────────┐
       │ PostgreSQL (Supabase)  │        │ PostgreSQL + PostGIS   │
       │ Upstash / Redis Cloud  │        │ Self-hosted / Managed  │
       └────────────────────────┘        └────────────────────────┘
```

### 1.1 Docker Multi-Stage Build Configuration (`Dockerfile`)
* **Builder Stage:** `node:20-alpine AS builder`
  * Copies `package*.json` and workspace manifests.
  * Installs dependencies via `npm install --legacy-peer-deps`.
  * Compiles NestJS backend: `npm run build -w @gozipp/api`.
* **Runtime Stage:** `node:20-alpine`
  * Lightweight footprint: extracts only `dist/` and production `node_modules`.
  * Exposes port `3000`.
  * Entrypoint: `npm run start -w @gozipp/api` (`node dist/main.js`).

### 1.2 Docker Compose Production Specification (`docker-compose.prod.yml`)
* **Service:** `gozipp-api`
  * Port mapping: `3000:3000`
  * Restart policy: `always`
  * Environment injections: `NODE_ENV=production`, `PORT=3000`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `REDIS_URL`, `FIREBASE_SERVICE_ACCOUNT_JSON`.

### 1.3 Staging Specification (`render.yaml`)
* **Service Name:** `gozipp-api-staging`
* **Build Command:** `npm install && npm run build --workspace=@gozipp/api`
* **Start Command:** `npm run start --workspace=@gozipp/api`
* **Health Check Path:** `/api/v1/health` ([`health.controller.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/health.controller.ts))

---

## 2. Environment Variables & Secret Management

The server enforces strict production checks during startup via `validateProductionEnvironment()` in [`packages/api/main.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/main.ts#L14-L43):

| Variable | Requirement in Production | Purpose |
| :--- | :--- | :--- |
| `DB_HOST`, `DB_PORT`, `DB_NAME` | Required | PostgreSQL database connection coordinates |
| `DB_USER`, `DB_PASSWORD` | Required | PostgreSQL credentials |
| `REDIS_URL` | Required | Redis connection string for Socket.IO adapter and queues |
| `JWT_SECRET` | Required ($\ge 64$ chars, non-placeholder) | HMAC key for signing JWT tokens |
| `PIN_PEPPER` | Required ($\ge 32$ chars, non-placeholder) | Secret salt for Argon2id PIN hashing |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Required | Firebase Admin credentials for Phone Auth token verification |
| `ALLOWED_ORIGINS` | Required | Whitelist for CORS security headers |
| `ALLOW_TEST_OTP` | **Must be false** in production | Disallows mock OTP bypass |
| `ALLOW_REGISTRATION_WITHOUT_OTP` | **Must be false** in production | Enforces phone ownership verification |

---

## 3. Database Connectivity & Resilience

* **TypeORM Pool Settings (`packages/api/app.module.ts` L93-108):**
  * `synchronize: false` (Strictly disabled to prevent accidental data destruction).
  * `retryAttempts: 3` (3 attempts with 3000ms delay to withstand network hiccups).
  * Connection Pool: `max: 20`, `idleTimeoutMillis: 30000`.
  * Auto-migration: Handled at runtime by `DatabaseMigrationService`.

---

## 4. Backup & Rollback Mechanics

1. **Database Snapshot (`package.json` L15):**
   * Script: `npm run db:backup`
   * Command: `docker exec -t gozipp-db pg_dumpall -c -U gozipp_user > backup_$(date +%Y-%m-%d).sql`
2. **Dual Mobility Zero-Downtime Migration Rule:**
   * Before applying Stage 2 schema changes on staging or production, a full SQL dump must be executed and archived.
   * New columns on `trips` must have non-null defaults (`DEFAULT 'MOTO'`).
   * No table drops or column removals are allowed during deployment.
