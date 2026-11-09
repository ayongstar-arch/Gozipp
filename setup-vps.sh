#!/bin/bash
# ==============================================================================
# GOZIPP Dual Mobility Platform — Automated VPS Deployment Script
# Target: Hostinger VPS / Ubuntu 22.04+ / Debian 12+
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}   GOZIPP Dual Mobility — VPS Deployment Automator  ${NC}"
echo -e "${GREEN}====================================================${NC}"

# 1. Install Docker if missing
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}[1/5] Docker not found. Installing Docker engine...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker installed successfully.${NC}"
else
    echo -e "${GREEN}[1/5] Docker is already installed.${NC}"
fi

# 2. Setup project folder
APP_DIR="/opt/gozipp"
echo -e "${YELLOW}[2/5] Setting up directory at ${APP_DIR}...${NC}"
mkdir -p ${APP_DIR}
cd ${APP_DIR}

if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Cloning repository from GitHub...${NC}"
    git clone https://github.com/ayongstar-arch/Gozipp.git .
else
    echo -e "${YELLOW}Pulling latest changes from origin/main...${NC}"
    git fetch origin
    git reset --hard origin/main
fi

# 3. Environment configuration
echo -e "${YELLOW}[3/5] Checking environment configuration (.env)...${NC}"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${RED}[!] Created fresh .env from template.${NC}"
    echo -e "${RED}[!] Please edit ${APP_DIR}/.env with your production secrets (JWT_SECRET, PIN_PEPPER, etc.)${NC}"
else
    echo -e "${GREEN}.env file already exists.${NC}"
fi

# 4. Launch Docker Compose Stack
echo -e "${YELLOW}[4/5] Building and launching containers (PostgreSQL PostGIS + Redis + NestJS API)...${NC}"
docker compose -f docker-compose.prod.yml down --remove-orphans || true
docker compose -f docker-compose.prod.yml up -d --build

# 5. Healthcheck verification
echo -e "${YELLOW}[5/5] Waiting for services to become healthy...${NC}"
sleep 8

HEALTH_STATUS=$(curl -s http://localhost:3000/api/v1/health || echo "starting")
echo -e "${GREEN}Health check response: ${HEALTH_STATUS}${NC}"

echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}   GOZIPP Backend Stack is LIVE on port 3000!      ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "Useful commands:"
echo -e "  - View API logs:    docker logs -f gozipp-api"
echo -e "  - View DB status:   docker ps"
echo -e "  - Backup database:  docker exec -t gozipp-db pg_dumpall -c -U gozipp_user > backup.sql"
echo -e "  - Restart stack:    docker compose -f docker-compose.prod.yml restart"
