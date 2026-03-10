FROM mcr.microsoft.com/playwright:v1.40.1-jammy

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
RUN npm install

COPY . .

RUN mkdir -p /app/backend/uploads /app/backend/downloads /app/backend/processed /app/backend/progress /app/backend/logs

EXPOSE 10000

CMD ["node", "backend/src/server.js"]

