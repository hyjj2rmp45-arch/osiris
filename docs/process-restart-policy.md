# OSIRIS Process & Restart Policy

**Version:** 1.0  
**Last Updated:** 2026-08-26  
**Owner:** OSIRIS Development / Operations Team  
**Status:** Active  

---

## 1. PURPOSE

This document defines the restart and process management policy for OSIRIS services, ensuring high availability and graceful degradation.

---

## 2. SERVICE RESTART POLICY

### 2.1 Automatic Restarts

- **Next.js API Server**: Restart on crash, deploy, or config change
- **Telegram Bot**: Restart on crash or every 24h (prevent memory leaks)
- **Background Workers**: Restart on crash or every 12h
- **Redis**: Managed by Docker, auto-restart on failure

### 2.2 Graceful Restart Sequence

1. Stop accepting new requests
2. Wait for in-flight requests to complete (max 30s)
3. Close database connections gracefully
4. Stop process
5. Start new process
6. Verify health checks pass

---

## 3. PROCESS MANAGEMENT

### 3.1 PM2 Configuration

```javascript
module.exports = {
  apps: [
    {
      name: 'osiris-api',
      script: 'pnpm start',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      watch: false,
      env: { NODE_ENV: 'production' },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
    },
    {
      name: 'osiris-telegram',
      script: 'pnpm start:bot',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      watch: false,
      cron_restart: '0 0 * * *', // Daily restart
      env: { NODE_ENV: 'production' },
    },
  ],
};
```

### 3.2 Health Check Endpoints

- **Liveness**: `GET /api/health/live` — process is running
- **Readiness**: `GET /api/health/ready` — dependencies are available
- **Startup**: `GET /api/health/startup` — initialization complete

---

## 4. MONITORING

- Monitor process memory usage
- Alert on restart loops (>3 restarts in 5 minutes)
- Track restart reasons (crash, deploy, manual)
- Log all restarts with timestamp and reason

---

## 5. ROLLBACK PROCEDURE

If new deployment causes issues:
1. `pm2 stop osiris-api`
2. `git revert HEAD`
3. `pnpm install && pnpm build`
4. `pm2 start osiris-api`
5. Verify health checks
