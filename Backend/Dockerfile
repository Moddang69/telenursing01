# ---------- Stage 1: Build ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# ---------- Stage 2: Production ----------
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# สร้าง non-root user เพื่อความปลอดภัย (Security Best Practice — ไม่รันเป็น root)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app /app
USER appuser

EXPOSE 5000
CMD ["node", "server.js"]
