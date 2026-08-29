import { createLogger, format, transports } from 'winston';
import { getEnv } from './config';

const env = getEnv();

const { combine, timestamp, printf, errors } = format;

const redactedFields = [
  'password',
  'token',
  'secret',
  'apiKey',
  'privateKey',
  'encryptedPrivateKey',
  'authorization',
  'cookie',
  'session',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_SECRET_KEY',
  'HELIUS_API_KEY',
  'DATABASE_URL',
  'REDIS_URL',
];

function redact(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return {};
  if (Array.isArray(obj)) return { items: obj.map(redact) };
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (redactedFields.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
      out[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      out[key] = redact(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const entry: Record<string, unknown> = {
    level,
    timestamp,
    message,
    ...redact(meta),
  };
  return JSON.stringify(entry);
});

const logger = createLogger({
  level: env.LOG_LEVEL,
  format: combine(timestamp({ format: 'iso' }), errors({ stack: true }), logFormat),
  transports: [new transports.Console()],
  silent: env.NODE_ENV === 'test',
});

export { logger };
