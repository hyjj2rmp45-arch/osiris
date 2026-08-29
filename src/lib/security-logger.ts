import { db } from './db';
import { auditLogs, securityEvents } from './schema';
import { logger } from './logger';
import { getEnv } from './config';

const env = getEnv();

type SecurityEventInput = {
  event: string;
  level?: 'info' | 'warn' | 'error' | 'critical';
  userId?: number;
  correlationId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Redact sensitive fields from metadata before logging.
 * Prevents accidental exposure of secrets in logs.
 */
export function redactSecrets(obj: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!obj) return obj;

  const sensitivePatterns = [
    /private[_\-]?key/i,
    /secret[_\-]?key/i,
    /api[_\-]?key/i,
    /api[_\-]?secret/i,
    /password/i,
    /token/i,
    /passphrase/i,
    /mnemonic/i,
    /seed[_\-]?phrase/i,
    /authorization/i,
    /bearer/i,
    /credential/i,
    /auth/i,
  ];

  const isSensitiveKey = (key: string): boolean => {
    return sensitivePatterns.some((pattern) => pattern.test(key));
  };

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      redacted[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactSecrets(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

export async function logAudit(input: SecurityEventInput) {
  const entry = {
    level: input.level ?? 'info',
    event: input.event,
    correlationId: input.correlationId ?? undefined,
    userId: input.userId ?? undefined,
    env: env.NODE_ENV,
    network: env.PHANTOM_NETWORK,
    metadata: redactSecrets(input.metadata ?? {}),
  };

  logger.info('audit', entry);

  try {
    await db.insert(auditLogs).values(entry);
  } catch (error) {
    logger.error('audit_log_persist_failed', { error, event: input.event });
  }
}

export async function logSecurityEvent(input: SecurityEventInput) {
  const entry = {
    level: input.level ?? 'warn',
    event: input.event,
    correlationId: input.correlationId ?? undefined,
    userId: input.userId ?? undefined,
    env: env.NODE_ENV,
    network: env.PHANTOM_NETWORK,
    metadata: redactSecrets(input.metadata ?? {}),
  };

  logger.warn('security', entry);

  try {
    await db.insert(securityEvents).values(entry);
  } catch (error) {
    logger.error('security_event_persist_failed', { error, event: input.event });
  }
}
