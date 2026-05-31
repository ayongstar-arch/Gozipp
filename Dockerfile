# --- WINNO MULTI-STAGE DOCKERFILE ---

# 1. Base Stage
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 2. Dependencies Stage
FROM base AS deps
COPY package*.json ./
RUN npm ci

# 3. Builder Stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Backend
RUN npm run backend:build

# Build Frontend (Next.js)
RUN npm run build

# 4. Runner Stage (Unified)
FROM base AS runner
ENV NODE_ENV production

# Copy necessary files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/constants.ts ./src/constants.ts
COPY --from=builder /app/ecosystem.config.js ./ecosystem.config.js

# Install PM2
RUN npm install -g pm2

# Expose ports
EXPOSE 3000 5173

# Start with PM2
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"]
