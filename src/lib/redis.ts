import Redis from 'ioredis';

/**
 * Redis connection helper for OSIRIS.
 * Uses environment vars for host/port/password; safe to run without Redis
 * (operations will fail gracefully at runtime, but the app still compiles).
 */
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB) || 0,
  // Disable reconnection storms during dev if Redis is down
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy: (times) => (times > 3 ? null : times * 200),
});

redis.on('error', (err) => {
  console.error('[redis] connection error:', err.message);
});

export default redis;