# worker-only image for orkestr.eu
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production
COPY src/ .
CMD ["node", "src/worker.js"]