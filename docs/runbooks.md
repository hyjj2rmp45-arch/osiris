# OSIRIS Runbooks

## 1. Startup
1. `cp .env.example .env` and fill secrets.
2. `npm install`
3. `npm run db:migrate` or `drizzle-kit push:pg`
4. `npm run dev`
5. Verify `curl http://localhost:3000/api/health` returns `{"status":"ok"}`.

## 2. Deployment
1. `npm run build`
2. `NODE_ENV=production npm start`
3. Reverse proxy: Cloudflare Tunnel or nginx with TLS.
4. Verify health, `/api/me`, and a protected dashboard route.

## 3. Incident Response
1. Check `/api/health` for degraded services.
2. Check logs: `logs/osiris-alerts.log` and Winston output.
3. If Redis is down, expect rate-limiter fallback behavior.
4. If RPC is degraded, failover routes are logged under `rpc.*`.
5. For payment issues, verify signature uniqueness and `payments.status`.

## 4. Key Rotation
1. Generate new `ENCRYPTION_KEY` and `TELEGRAM_SECRET_KEY`.
2. Update `.env` and restart.
3. Rotate sessions if needed via admin tooling.

## 5. Backup
1. Dump PostgreSQL daily.
2. Archive `logs/osiris-alerts.log`.
3. Keep `.env` offline; never commit secrets.
