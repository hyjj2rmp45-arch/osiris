# TLS configuration files for production deployment.

## Caddy (recommended)
- Place `Caddyfile` at repo root.
- Run: `caddy run --config Caddyfile`
- Caddy will auto-provision TLS via Let's Encrypt.

## Alternative: nginx
- See `docs/nginx.conf` for a static TLS termination example.
- Use with `certbot` for Let's Encrypt.

## Headers
Security headers are already applied in `src/middleware.ts`.
