# Deviations

## 1. Optional Redis
Redis is treated as optional. Rate-limiter uses fail-open for non-critical actions when Redis is unreachable.

## 2. Dynamic Health Checks
`/api/health` performs live checks and may make outbound requests during POST actions.

## 3. Telemetry
Logs are structured JSON via Winston. `logs/osiris-alerts.log` is rotated at 5 MB.

## 4. Environment Loading
Env validation is lazy. Missing optional secrets do not block compilation.

## 5. Better-auth Removed
Custom Telegram auth is used instead of better-auth.
