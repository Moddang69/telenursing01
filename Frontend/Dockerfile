# ---------- Stage 1: Build ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Vite ฝังค่า VITE_* ลงในไฟล์ตอน build — ต้องประกาศ ARG ไม่งั้นค่าจาก docker-compose (build args) จะถูกเมิน
ARG VITE_API_BASE_URL
ARG VITE_SOCKET_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
RUN npm run build

# ---------- Stage 2: Serve ด้วย Nginx ----------
FROM nginx:1.27-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]