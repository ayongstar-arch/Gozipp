# GOZIPP DUAL MOBILITY PLATFORM
# ZERO-COST LOCAL TESTING GUIDE VIA CLOUDFLARE TUNNEL

**Document ID:** GOZIPP-ZERO-COST-LOCAL-V1.0  
**Cost:** **0 THB (100% Free / No Credit Card Needed)**  
**Environment:** Local PC Hardware + Cloudflare Quick Tunnel (Edge)  
**Date:** 2026-11-17  

---

## 1. HOW IT WORKS (ZERO-COST ARCHITECTURE)

Instead of paying for a cloud server before you are ready, this solution utilizes your own Windows PC (which has plenty of RAM and CPU) to host the full backend stack, and uses **Cloudflare Tunnel (`cloudflared`)** inside Docker to generate a free public HTTPS domain:

```
    [ Real Mobile Phone 4G/5G ] ──────────── (Passenger / Driver)
                │
                ▼ (Public HTTPS)
    [ Cloudflare Edge Network ]
                │
                ▼ (Encrypted Tunnel / No Port Forwarding Required)
    [ Your Local Windows PC ]
        ├── gozipp-tunnel (cloudflare/cloudflared Docker container)
        ├── gozipp-api    (NestJS API + Socket.IO WebSockets)
        ├── gozipp-redis  (Redis 7 Cache & Lock P0)
        └── gozipp-db     (PostgreSQL 15 with PostGIS extension)
```

---

## 2. STEP-BY-STEP QUICK START

### Step 1: Open Docker Desktop
Your PC already has **Docker Desktop** installed at:  
`C:\Program Files\Docker\Docker\Docker Desktop.exe`

* Just open Docker Desktop from your Start Menu and wait until the whale icon in the taskbar turns solid (ready).

---

### Step 2: Start the System (One-Click)
In the project folder `c:\Users\acer\Videos\Project\Gozipp`:
* Double-click **[`start-free-local.bat`](file:///c:/Users/acer/Videos/Project/Gozipp/start-free-local.bat)**  
  *(หรือเปิด PowerShell แล้วรัน: `docker compose -f docker-compose.local.yml up -d`)*

Docker will automatically download the lightweight images and start all 4 services:
1. `gozipp-db`: ฐานข้อมูล PostGIS รองรับคำนวณพิกัดรัศมี 1.5–5 กม.
2. `gozipp-redis`: แคชคิว และระบบป้องกันคนขับรับงานซ้อน (P0 Lock)
3. `gozipp-api`: ระบบหลัก NestJS และ Socket.IO WebSocket
4. `gozipp-tunnel`: ท่อเชื่อมต่อออกสู่อินเทอร์เน็ตฟรีจาก Cloudflare

---

### Step 3: View Your Public HTTPS Tunnel URL
Run this command in terminal:
```bash
docker logs gozipp-tunnel
```
You will see output containing your unique public URL, for example:
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://speedy-driver-mobility-test.trycloudflare.com                                     |
+--------------------------------------------------------------------------------------------+
```

---

### Step 4: Test Real-Time Ride Hailing on Mobile Phones

1. **Verify Backend Health:**  
   Open on your mobile phone browser:  
   `https://<your-tunnel-url>.trycloudflare.com/api/v1/health`  
   *(Expected result: `{"status":"ok","database":"connected","redis":"connected"}`)*

2. **Test Passenger & Driver Flow:**
   * **Login OTP:** In this local mode, `ALLOW_TEST_OTP=true` is enabled, meaning you can enter any phone number and use OTP **`123456`** to log in without needing SMS credits.
   * **Dual Mobility:** Both `MOTO` and `TAXI` are enabled for full testing.
   * **Real-time GPS:** Both driver and passenger apps connect over `wss://` via the Cloudflare Tunnel.

---

### Step 5: Stop the System When Finished
When you are done testing, run:
```bash
docker compose -f docker-compose.local.yml down
```
All database records remain saved in the local Docker volume `pgdata_local`, ready for the next test session.
