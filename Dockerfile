FROM node:20-alpine
WORKDIR /app
# Force cache bust for fresh COPY
COPY src/ ./src
CMD ["node", "src/worker.js"]
