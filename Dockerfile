FROM node:22-alpine
WORKDIR /app
COPY src/ ./src
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
USER appuser
CMD ["node", "src/worker.js"]
