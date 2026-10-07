FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/mobile-driver/package.json ./apps/mobile-driver/
COPY apps/web-admin/package.json ./apps/web-admin/
COPY apps/web-passenger/package.json ./apps/web-passenger/
COPY packages/api/package.json ./packages/api/
COPY .npmrc ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build -w @gozipp/api

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/api/package.json ./packages/api/
COPY --from=builder /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=builder /app/packages/api/dist ./packages/api/dist
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@gozipp/api"]

