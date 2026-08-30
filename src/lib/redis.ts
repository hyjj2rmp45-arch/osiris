import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;
const redisDb = Number(process.env.REDIS_DB) || 0;

export const redis = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  db: redisDb,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy: (times) => (times > 3 ? null : times * 200),
});

redis.on('error', (err) => {
  console.error('[redis] connection error:', err.message);
});

export default redis;