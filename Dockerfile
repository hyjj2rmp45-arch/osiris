FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev --prefer-offline --no-audit --no-fund
COPY src/worker.js .
CMD ["node", "worker.js"]
