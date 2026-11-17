# GOZIPP DUAL MOBILITY PLATFORM
# 100% FREE TIER CLOUD DEPLOYMENT GUIDE (0 THB)

**Document ID:** GOZIPP-FREE-TIER-V1.0  
**Stack:** Vercel (Frontend) + Render (Backend API & WebSockets) + Supabase (PostgreSQL PostGIS) + Upstash (Redis)  
**Cost:** **0 THB / Month**  
**Target:** Staging, Demo, and Initial User Testing  
**Date:** 2026-11-17  

---

## 1. ARCHITECTURE OVERVIEW (FREE TIER)

```
                            [ Mobile & Web Clients ]
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │      Vercel (Hobby Free)      │
                       │    - apps/web-passenger       │
                       │    - apps/web-admin           │
                       └───────────────┬───────────────┘
                                       │
                                       ▼ (HTTPS / WSS)
                       ┌───────────────────────────────┐
                       │     Render.com (Free Web)     │
                       │    - gozipp-api (NestJS)      │
                       │    - Real-time Socket.IO      │
                       │    - Outbox Polling Worker    │
                       └───────┬───────────────┬───────┘
                               │               │
                               ▼               ▼
           ┌────────────────────────┐    ┌────────────────────────┐
           │  Supabase (Free 500MB) │    │ Upstash (Free Redis)   │
           │  PostgreSQL 15+PostGIS │    │ Pub/Sub & P0 Lock      │
           └────────────────────────┘    └────────────────────────┘
```

---

## 2. STEP-BY-STEP SETUP INSTRUCTIONS

### STEP 1: Create Free PostgreSQL with PostGIS on Supabase (2 mins)
1. Go to [supabase.com](https://supabase.com) and click **Start your project** (Sign in with GitHub).
2. Click **New Project**:
   - **Name:** `gozipp-db`
   - **Database Password:** Enter a strong password (save this safely!).
   - **Region:** `Southeast Asia (Singapore)`
   - **Pricing Plan:** Free ($0/month).
3. Enable PostGIS Extension:
   - On the left sidebar, click **SQL Editor**.
   - Paste and run:
     ```sql
     CREATE EXTENSION IF NOT EXISTS postgis;
     ```
   - Click **Run** (Result should say `Success. No rows returned`).
4. Get Connection Details:
   - Go to **Project Settings** (gear icon) $\rightarrow$ **Database**.
   - Under **Connection parameters**, note:
     - **Host:** `db.<your-project-ref>.supabase.co`
     - **Port:** `5432` (or Transaction pooler `6543`)
     - **Database name:** `postgres`
     - **User:** `postgres`
     - **Password:** `<your-database-password>`

---

### STEP 2: Create Free Serverless Redis on Upstash (1 min)
1. Go to [upstash.com](https://upstash.com) and sign in with GitHub.
2. Click **Create Database**:
   - **Name:** `gozipp-redis`
   - **Type:** Regional
   - **Region:** `ap-southeast-1 (Singapore)`
   - **TLS (SSL):** Enabled
3. In the database dashboard, find **REST API / Node / ioredis** connection string:
   - Copy the `UPSTASH_REDIS_REST_URL` or standard URL:
     ```text
     rediss://default:<password>@<endpoint>.upstash.io:6379
     ```

---

### STEP 3: Deploy Backend on Render.com (3 mins)
1. Go to [render.com](https://render.com) and sign in with GitHub.
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository: `ayongstar-arch/Gozipp`.
4. Configure the Web Service:
   - **Name:** `gozipp-api`
   - **Region:** `Singapore (Southeast Asia)`
   - **Branch:** `main`
   - **Root Directory:** leave blank (or `.`)
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm install --legacy-peer-deps && npm run build --workspace=@gozipp/api
     ```
   - **Start Command:**
     ```bash
     npm run start --workspace=@gozipp/api
     ```
   - **Instance Type:** **Free** (512 MB RAM, 0.1 CPU).
5. Add Environment Variables (in **Environment Variables** section):
   | Key | Value |
   |:---|:---|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `DB_HOST` | `db.<project-ref>.supabase.co` (from Supabase) |
   | `DB_PORT` | `5432` |
   | `DB_USER` | `postgres` |
   | `DB_PASSWORD` | `<your-supabase-password>` |
   | `DB_NAME` | `postgres` |
   | `DB_SSL` | `true` |
   | `REDIS_URL` | `rediss://default:...@...upstash.io:6379` (from Upstash) |
   | `JWT_SECRET` | `gozipp_super_secure_jwt_secret_token_minimum_64_characters_long_stage4_prod` |
   | `PIN_PEPPER` | `gozipp_pin_pepper_32_characters_long_min` |
   | `ALLOWED_ORIGINS` | `*` (or your Vercel URL) |
   | `ALLOW_TEST_OTP` | `false` |
   | `ALLOW_REGISTRATION_WITHOUT_OTP` | `false` |
   | `TAXI_PUBLIC_BOOKING_ENABLED` | `false` |
6. Click **Create Web Service**.
   - Render will build the NestJS backend and automatically run database migrations on boot.
   - Once deployed, copy your free URL (e.g. `https://gozipp-api.onrender.com`).
   - Test health check: Open `https://gozipp-api.onrender.com/api/v1/health` in your browser.

---

### STEP 4: Point Frontend on Vercel to Render Backend (1 min)
1. Go to [vercel.com](https://vercel.com) $\rightarrow$ open project **`web-passenger`**.
2. Go to **Settings** $\rightarrow$ **Environment Variables**.
3. Update or Add:
   - `NEXT_PUBLIC_API_URL` = `https://gozipp-api.onrender.com`
   - `NEXT_PUBLIC_SOCKET_URL` = `https://gozipp-api.onrender.com`
   - `NEST_API_URL` = `https://gozipp-api.onrender.com`
   - `NEXT_PUBLIC_USE_REAL_SOCKET` = `true`
4. Go to **Deployments** $\rightarrow$ Click the latest deployment $\rightarrow$ click **Redeploy**.

---

## 3. FREE TIER NOTES & BEHAVIOR
* **Cold Starts (Sleep):** On Render's Free tier, if there is no web traffic for 15 minutes, the backend will sleep to save resources. When someone visits the app or calls the API, Render will spin it back up (takes ~30-40 seconds on the very first request). Subsequent requests are instant.
* **Storage:** Photo uploads use the built-in local fallback or free Cloudflare R2 (10GB free).
* **Cost:** **0 THB / Month**.
