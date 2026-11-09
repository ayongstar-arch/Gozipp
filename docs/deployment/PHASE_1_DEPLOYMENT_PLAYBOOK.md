# GOZIPP DUAL MOBILITY PLATFORM
# PHASE 1 DEPLOYMENT PLAYBOOK: STAGING TO INITIAL LAUNCH

**Document ID:** GOZIPP-DEPLOY-PLAYBOOK-V1.0  
**Target Environment:** Phase 1 — Hybrid Production/Staging Architecture (0 - 500 Rides/Day)  
**Date:** 2026-11-09  
**Execution Authority:** Antigravity AI Engineering Suite  
**Status:** ACTIVE SPECIFICATION & OPERATIONAL DIRECTIVE  

---

## 1. PHASE 1 ARCHITECTURE SPECIFICATION

Phase 1 provides an optimal balance between **low operating cost**, **high performance**, and **system resilience**. It decouples stateless frontend rendering (Vercel) from stateful real-time WebSockets and database persistence (Docker Container Host).

```
                      ┌──────────────────────────────────────┐
                      │          GitHub Repository           │
                      │     (ayongstar-arch/Gozipp.git)      │
                      └───────┬──────────────────────┬───────┘
                              │                      │
             (Next.js CI/CD)  │                      │  (Git Pull / Docker)
                              ▼                      ▼
               ┌───────────────────────┐   ┌───────────────────────────┐
               │    Vercel Edge CDN    │   │  Hostinger / Linux VPS    │
               │  (Passenger Web App)  │   │  (Docker Compose Stack)   │
               │                       │   │                           │
               │  - apps/web-passenger │   │  - gozipp-api (NestJS)    │
               │  - apps/mobile-driver │   │  - gozipp-db (PostGIS)    │
               │  - apps/web-admin     │   │  - gozipp-redis (Cache)   │
               └───────────┬───────────┘   └─────────────┬─────────────┘
                           │                             │
                           │     HTTPS / WebSocket       │
                           └─────────────────────────────┘
                                         │
                                         ▼
                           ┌───────────────────────────┐
                           │      AWS S3 Storage       │
                           │   (ap-southeast-1 S3)     │
                           │  Driver docs & KYC files  │
                           └───────────────────────────┘
```

---

## 2. PRE-DEPLOYMENT ENVIRONMENT MATRIX

### 2.1 Backend Environment Configuration (`.env`)
The backend container requires the following production environment variables:

| Variable | Recommended Phase 1 Value | Purpose |
|:---|:---|:---|
| `NODE_ENV` | `production` | Enables TypeORM caching, Helmet security, and validation |
| `PORT` | `3000` | Internal container port (mapped to host 3000 or 80/443 via Nginx) |
| `DB_HOST` | `gozipp-db` (Docker) or Host IP | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `gozipp_user` | PostgreSQL database user |
| `DB_PASSWORD` | `<SECURE_PASSWORD>` | Strong password ($\ge 24$ chars) |
| `DB_NAME` | `gozipp_db` | Primary database name |
| `REDIS_URL` | `redis://gozipp-redis:6379` | Internal Redis service URL |
| `JWT_SECRET` | `<64_CHAR_HEX_SECRET>` | HMAC secret for session authentication |
| `PIN_PEPPER` | `<32_CHAR_HEX_SECRET>` | Server-side pepper for Argon2id PIN hashing |
| `ALLOWED_ORIGINS` | `https://gozipp.app,https://driver.gozipp.app,https://admin.gozipp.app` | CORS whitelist for frontends |
| `OTP_PROVIDER` | `firebase` | Master OTP provider |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `/app/firebase-service-account.json` | Path to Firebase Admin credentials |
| `AWS_REGION` | `ap-southeast-1` | AWS S3 region (Singapore) |
| `AWS_ACCESS_KEY_ID` | `<IAM_USER_KEY>` | S3 programmatic upload key |
| `AWS_SECRET_ACCESS_KEY` | `<IAM_USER_SECRET>` | S3 programmatic secret |
| `AWS_S3_BUCKET` | `gozipp-uploads` | S3 bucket for driver KYC and licenses |
| `TAXI_PUBLIC_BOOKING_ENABLED` | `false` (Staging default) | Feature flag isolating TAXI booking |

---

## 3. STEP-BY-STEP DEPLOYMENT PROCEDURE

### STEP 1: Git Repository Synchronization
Commit and tag the certified Stage 4 code:
```bash
# 1. Inspect status
git status

# 2. Stage all modifications and additions
git add apps/ packages/ docs/ docker-compose.prod.yml Dockerfile package.json

# 3. Commit with semantic message
git commit -m "feat(dual-mobility): complete Stage 4 passenger booking and driver experience"

# 4. Push to remote
git push origin main
```

---

### STEP 2: Backend Container Host Deployment (Hostinger VPS / Linux Server)

1. **Server Prerequisites:**
   ```bash
   # Ensure Docker and Docker Compose are installed
   docker --version
   docker compose version
   ```

2. **Repository Setup:**
   ```bash
   # Clone or pull on VPS
   git clone https://github.com/ayongstar-arch/Gozipp.git /opt/gozipp
   cd /opt/gozipp

   # Create production .env file
   cp .env.example .env
   nano .env # Fill in production credentials
   ```

3. **Launch Docker Stack:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

4. **Verify Health & Migration:**
   ```bash
   # Check running containers
   docker ps

   # Check backend logs and migration execution
   docker logs -f gozipp-api

   # Verify HTTP Healthcheck
   curl -i http://localhost:3000/api/v1/health
   ```
   *Expected Response:* `{"status":"ok","timestamp":"2026-11-09T...","database":"connected","redis":"connected"}`

5. **Nginx Reverse Proxy & SSL Setup (Certbot):**
   ```nginx
   # /etc/nginx/sites-available/api.gozipp.app
   server {
       server_name api.gozipp.app;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   Run `certbot --nginx -d api.gozipp.app` to enable free Let's Encrypt SSL.

---

### STEP 3: Frontend Deployment on Vercel (`apps/web-passenger`)

1. **Vercel Project Setup:**
   - Log into [Vercel Dashboard](https://vercel.com).
   - Import Git Repository: `ayongstar-arch/Gozipp`.
   - **Framework Preset:** `Next.js`.
   - **Root Directory:** Edit $\rightarrow$ select `apps/web-passenger`.

2. **Build & Development Settings:**
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install --legacy-peer-deps`

3. **Environment Variables Configuration:**
   Add the following in Vercel Project Settings $\rightarrow$ Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://api.gozipp.app`
   - `NEXT_PUBLIC_SOCKET_URL` = `https://api.gozipp.app`
   - `NEST_API_URL` = `https://api.gozipp.app`
   - `NEXT_PUBLIC_USE_REAL_SOCKET` = `true`
   - `NEXT_PUBLIC_ALLOW_REGISTRATION_WITHOUT_OTP` = `false`

4. **Trigger Deployment:**
   - Click **Deploy**. Vercel will build and assign `gozipp-passenger.vercel.app`.
   - Assign custom domain (e.g. `gozipp.app`).

---

### STEP 4: Driver App Deployment (`apps/mobile-driver`)

The Driver PWA can be deployed either on Vercel or hosted statically on the VPS / S3:
1. **On Vercel:**
   - Add new Vercel Project pointing to the same repository.
   - Root Directory: `apps/mobile-driver`.
   - Environment Variable: `NEXT_PUBLIC_API_URL` = `https://api.gozipp.app`.
   - Assign custom domain (e.g. `driver.gozipp.app`).

---

### STEP 5: AWS S3 Bucket Setup for KYC Documents

1. Create Bucket: `gozipp-uploads` in Region `ap-southeast-1`.
2. Configure **Block Public Access**: Enable (All public access blocked; files are served via pre-signed URLs or backend stream).
3. Configure **CORS Policy**:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST"],
       "AllowedOrigins": ["https://driver.gozipp.app", "https://admin.gozipp.app"],
       "ExposeHeaders": []
     }
   ]
   ```
4. Attach IAM User with `AmazonS3FullAccess` (or scoped policy to `gozipp-uploads/*`) and save credentials into `.env`.

---

### STEP 6: Automated Database Backup Setup

On the VPS host, set up a daily cronjob at 03:00 AM:
```bash
# Add to crontab via `crontab -e`
0 3 * * * docker exec -t gozipp-db pg_dumpall -c -U gozipp_user | gzip > /opt/backups/gozipp_db_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz
```

---

## 4. SMOKE TEST & GO-LIVE VERIFICATION CHECKLIST

After deployment, verify the following 7 critical paths:
1. [ ] **Health Endpoint:** `curl https://api.gozipp.app/api/v1/health` returns `200 OK`.
2. [ ] **WebSocket Ping:** Client app connects to `wss://api.gozipp.app/socket.io/?EIO=4&transport=websocket`.
3. [ ] **Passenger Registration:** Phone OTP delivered via Firebase Phone Auth; PIN setup succeeds.
4. [ ] **Driver Availability:** Driver can switch online (`status: 'IDLE'`); GPS pings received in Redis.
5. [ ] **MOTO Ride Request:** Passenger creates booking; nearest driver receives `TRIP_NEW` event; 2 THB fee deducted.
6. [ ] **Driver Arrival Geofence:** Driver arrival $\le 100$ meters marks trip as `VERIFIED`.
7. [ ] **TAXI Staging Isolation:** Attempting TAXI booking without feature flag throws expected 400 rejection.
