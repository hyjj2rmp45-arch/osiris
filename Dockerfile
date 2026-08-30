FROM node:20-alpine
WORKDIR /app
COPY src/ .
CMD ["node", "src/worker.js"]
