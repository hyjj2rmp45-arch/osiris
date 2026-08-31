FROM node:22-alpine
WORKDIR /app
COPY src/ ./src
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup && \
    npm uninstall -g npm 2>/dev/null; true && \
    apk add --no-cache --upgrade openssl libssl3 libcrypto3 2>/dev/null; true

USER appuser
CMD ["node", "src/worker.js"]
