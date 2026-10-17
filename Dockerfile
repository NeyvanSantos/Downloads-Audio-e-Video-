FROM node:22-alpine
RUN apk add --no-cache python3 ffmpeg yt-dlp
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build && npm prune --omit=dev
EXPOSE 3001
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/app.js"]
