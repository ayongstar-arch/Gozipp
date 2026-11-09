# GOZIPP DUAL MOBILITY PLATFORM
# CLOUDFLARE INTEGRATION & EDGE SETUP GUIDE

**Document ID:** GOZIPP-CLOUDFLARE-SETUP-V1.0  
**Project:** GOZIPP Dual Mobility Platform  
**Architecture Layer:** Edge Network, DNS, WAF, and Object Storage (R2)  
**Target:** Phase 1 Hybrid (Cloudflare + Vercel + Hostinger/Docker) $\rightarrow$ Phase 2/3 (AWS)  
**Date:** 2026-11-09  

---

## 1. ARCHITECTURE OVERVIEW

Cloudflare acts as the global edge security, DNS, caching layer, and zero-egress object storage (R2) for GOZIPP:

```
                            [ User Mobile & Web Clients ]
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │    Cloudflare Edge Network (BKK PoP)  │
                      │                                       │
                      │  - DNS Management & Free Let's Encrypt│
                      │  - Unmetered DDoS & Bot Mitigation    │
                      │  - WAF Rate Limiting on OTP Endpoints │
                      │  - Zero-Egress R2 Storage (KYC Docs)  │
                      └───────┬───────────────────────┬───────┘
                              │                       │
           (HTTP / Web Pages) │                       │ (WSS / REST API)
                              ▼                       ▼
                   ┌─────────────────────┐   ┌─────────────────────────┐
                   │    Vercel Edge      │   │  Hostinger / Docker VPS │
                   │  (Next.js Web Apps) │   │  (gozipp-api / Socket)  │
                   └─────────────────────┘   └────────────┬────────────┘
                                                          │
                                         (S3 API Uploads) │
                                                          ▼
                                             ┌─────────────────────────┐
                                             │    Cloudflare R2 Bucket │
                                             │   (Zero Bandwidth Cost) │
                                             └─────────────────────────┘
```

---

## 2. STEP-BY-STEP CLOUDFLARE CONFIGURATION

### STEP 1: Domain DNS Setup in Cloudflare
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Add Site: `gozipp.app`.
3. Choose the **Free Plan** (Includes unmetered DDoS, Global CDN, and SSL).
4. Update your domain registrar nameservers to the assigned Cloudflare nameservers (e.g. `dave.ns.cloudflare.com`).
5. Configure DNS Records:
   | Type | Name | Content / Target | Proxy Status | Purpose |
   |:---|:---|:---|:---:|:---|
   | `CNAME` | `@` (or `gozipp.app`) | `cname.vercel-dns.com` | **Proxied (Orange Cloud)** | Passenger Web App on Vercel |
   | `CNAME` | `driver` | `cname.vercel-dns.com` | **Proxied (Orange Cloud)** | Driver Mobile App on Vercel |
   | `CNAME` | `admin` | `cname.vercel-dns.com` | **Proxied (Orange Cloud)** | Admin Dashboard on Vercel |
   | `A` | `api` | `<YOUR_VPS_PUBLIC_IP>` | **Proxied (Orange Cloud)** | NestJS Backend & Socket.IO |
   | `CNAME` | `media` | `<R2_CUSTOM_DOMAIN>` | **Proxied (Orange Cloud)** | Public CDN for KYC Documents |

---

### STEP 2: SSL/TLS Encryption Mode
In Cloudflare Dashboard $\rightarrow$ **SSL/TLS** $\rightarrow$ **Overview**:
* Select **Full (strict)**.
* In **Edge Certificates**:
  * Enable **Always Use HTTPS**: ON
  * Enable **Automatic HTTPS Rewrites**: ON
  * Minimum TLS Version: **TLS 1.2**

---

### STEP 3: WebSocket Support Configuration
Real-time tracking and dispatch in GOZIPP require persistent WebSockets (`wss://api.gozipp.app`):
1. In Cloudflare Dashboard $\rightarrow$ **Network**:
   * Verify **WebSockets** is toggled **ON** (Enabled by default on all plans).
2. Cloudflare natively proxies Socket.IO traffic over standard ports `443` (WSS).

---

### STEP 4: WAF & OTP Rate Limiting Rule
To prevent SMS pumping attacks on `/api/v1/auth/request-otp` without blocking legitimate users:
1. In Cloudflare Dashboard $\rightarrow$ **Security** $\rightarrow$ **WAF** $\rightarrow$ **Rate limiting rules**:
2. Click **Create rule**:
   * **Rule name:** `Protect OTP Endpoint`
   * **Field:** URI Path $\rightarrow$ equals $\rightarrow$ `/api/v1/auth/request-otp`
   * **Requests:** Greater than `5` requests per `1 minute` per IP
   * **Action:** `Block` or `Managed Challenge` (Captcha) for 10 minutes.

---

### STEP 5: Cloudflare R2 Storage (S3-Compatible Zero-Egress)

Cloudflare R2 provides object storage compatible with the AWS S3 SDK with **\$0 egress bandwidth fees**:

1. In Cloudflare Dashboard $\rightarrow$ **R2** $\rightarrow$ **Create Bucket**:
   * Bucket Name: `gozipp-uploads`
   * Location: Automatic or Asia-Pacific.
2. In Bucket Settings $\rightarrow$ **Public Access**:
   * You can connect custom domain: `media.gozipp.app`.
3. In R2 Overview $\rightarrow$ **Manage R2 API Tokens**:
   * Click **Create API Token**.
   * Permissions: **Object Read & Write**.
   * Copy:
     - `Access Key ID`
     - `Secret Access Key`
     - `S3 API Endpoint URL` (e.g. `https://<account_id>.r2.cloudflarestorage.com`)

4. Configure in your backend `.env`:
   ```bash
   AWS_ACCESS_KEY_ID=<your-r2-access-key-id>
   AWS_SECRET_ACCESS_KEY=<your-r2-secret-access-key>
   AWS_S3_BUCKET=gozipp-uploads
   S3_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com
   S3_PUBLIC_URL=https://media.gozipp.app
   ```
   *The backend [`s3.service.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/common/s3.service.ts) detects the R2 endpoint automatically and routes all driver licenses, KYC, and vehicle photos without any additional code changes.*

---

## 3. FUTURE MIGRATION TO AWS (PHASE 2 & 3)

When GOZIPP grows to 1,000+ rides per day and migrates the backend into **AWS ECS Fargate + Amazon RDS PostgreSQL + Amazon ElastiCache**:

1. **Keep Cloudflare as the Global Edge:**
   - Do NOT delete Cloudflare when moving to AWS.
   - Point the `api.gozipp.app` `A` or `CNAME` record to the **AWS Application Load Balancer (ALB)** DNS.
2. **Cost Benefits on AWS:**
   - Cloudflare caches API responses and handles SSL termination at the Bangkok Edge, saving thousands of dollars in AWS CloudFront data transfer costs.
3. **Storage Option:**
   - You can either keep driver files on Cloudflare R2 (to maintain \$0 egress cost), or migrate bucket contents to Amazon S3 via AWS DataSync in a single command.
