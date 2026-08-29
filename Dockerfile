FROM node:20-alpine
WORKDIR /app
COPY src/worker.js .
CMD ["node", "worker.js"]
