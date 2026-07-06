# ─── Build stage ─────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache python3 py3-pip ffmpeg
RUN python3 -m pip install --no-cache-dir yt-dlp --quiet

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Production stage ────────────────────────────────────
FROM node:22-alpine

# Only ffmpeg + yt-dlp needed at runtime
RUN apk add --no-cache python3 py3-pip ffmpeg && \
    python3 -m pip install --no-cache-dir yt-dlp --quiet && \
    rm -rf /root/.cache /tmp/*

WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node_modules/.bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
