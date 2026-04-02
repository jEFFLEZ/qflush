FROM node:22-bookworm-slim

ENV PATH=/app/node_modules/.bin:$PATH

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund

COPY . .
RUN npm run railway:build

EXPOSE 8080

CMD ["node", "dist/daemon/qflushd.js"]
