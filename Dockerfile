FROM mcr.microsoft.com/playwright:v1.40.1-jammy

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

WORKDIR /app
COPY . .

RUN mkdir -p /app/backend/uploads /app/backend/downloads /app/backend/processed /app/backend/progress /app/backend/logs

EXPOSE 10000

CMD ["node", "backend/src/server.js"]

