@echo off
echo ============================================================
echo   GOZIPP Dual Mobility — Zero-Cost Local + Cloudflare Stack
echo ============================================================

REM 1. Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Docker Desktop is not running.
    echo [*] Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo [*] Waiting for Docker daemon to become ready...
    :wait_docker
    timeout /t 5 /nobreak >nul
    docker info >nul 2>&1
    if %errorlevel% neq 0 goto wait_docker
    echo [OK] Docker Desktop is ready!
)

REM 2. Launch Local Stack
echo [*] Building and launching PostGIS DB, Redis, API and Cloudflare Tunnel...
docker compose -f docker-compose.local.yml up -d --build

REM 3. Retrieve Cloudflare Tunnel URL
echo [*] Fetching Cloudflare Public HTTPS Tunnel URL...
timeout /t 6 /nobreak >nul
docker logs gozipp-tunnel 2>&1 | findstr /C:"trycloudflare.com"

echo.
echo ============================================================
echo   GOZIPP is LIVE on your PC and the Internet!
echo   - To stop:  docker compose -f docker-compose.local.yml down
echo   - View logs: docker logs -f gozipp-api
echo   - Tunnel:    docker logs gozipp-tunnel
echo ============================================================
pause
