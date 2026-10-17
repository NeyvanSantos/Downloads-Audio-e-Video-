FROM node:18-alpine

RUN apk add --no-cache python3 make g++ ffmpeg yt-dlp

WORKDIR /app

COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN npm install -g concurrently
RUN cd backend && npm install
RUN cd frontend && npm install

COPY backend/. ./backend/
COPY frontend/. ./frontend/

RUN cd backend && npm run build
RUN cd frontend && npm run build

EXPOSE 3000

CMD ["npx", "concurrently", "npm run start --prefix backend", "npm run preview --prefix frontend"]
