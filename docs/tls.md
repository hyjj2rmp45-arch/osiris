# TLS Guidance

## Local Dev
- Use Cloudflare Tunnel: `cloudflared tunnel --url http://localhost:3000`
- Or ngrok: `ngrok http 3000`

## Production
- Terminate TLS at reverse proxy (nginx, Cloudflare, or load balancer).
- Set `secure: true` on cookies in production.
- Use `HSTS` header via middleware or proxy.
- Verify certificate chain and disable TLS 1.0/1.1.

## Headers
Recommended security headers via middleware:
- `Strict-Transport-Security`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=()`
