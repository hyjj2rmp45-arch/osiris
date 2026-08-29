import { kekService } from '@/lib/crypto';
import { logger } from '@/lib/logger';
import { logSecurityEvent } from '@/lib/security-logger';
import { createCorrelationId } from '@/lib/safety-manager';

const MAX_SIGNATURES_PER_MINUTE = 10;
const signatureTimestamps: number[] = [];

function checkSignRateLimit(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  signatureTimestamps.push(now);

  const recent = signatureTimestamps.filter((ts) => ts > oneMinuteAgo);
  signatureTimestamps.length = 0;
  recent.forEach((ts) => signatureTimestamps.push(ts));

  return recent.length <= MAX_SIGNATURES_PER_MINUTE;
}

export class SignerService {
  isReady(): boolean {
    return kekService.isReady();
  }

  async sign(message: string, context?: { userId?: number; walletId?: string }): Promise<string> {
    if (!kekService.isReady()) {
      const correlationId = createCorrelationId();
      await logSecurityEvent({
        event: 'signer.unavailable',
        correlationId,
        metadata: {
          context,
        },
      });
      throw new Error('Signer not initialized');
    }

    if (!checkSignRateLimit()) {
      const correlationId = createCorrelationId();
      logger.warn('signer.rate_limited', {
        correlationId,
        context,
        limit: MAX_SIGNATURES_PER_MINUTE,
      });
      await logSecurityEvent({
        event: 'signer.rate_limited',
        ...(context?.userId ? { userId: context.userId } : {}),
        correlationId,
        metadata: {
          context,
          limit: MAX_SIGNATURES_PER_MINUTE,
        },
      });
      throw new Error('Signing rate limit exceeded');
    }

    const correlationId = createCorrelationId();
    const signature = kekService.encrypt(message);

    logger.info('signer.signed', {
      correlationId,
      context,
      messageLength: message.length,
    });

    await logSecurityEvent({
      event: 'signer.signed',
      ...(context?.userId ? { userId: context.userId } : {}),
      correlationId,
      metadata: {
        context,
        messageLength: message.length,
      },
    });

    return signature;
  }

  async verify(message: string, signature: string): Promise<boolean> {
    if (!kekService.isReady()) {
      return false;
    }

    try {
      const decrypted = kekService.decrypt(signature);
      return decrypted === message;
    } catch {
      return false;
    }
  }
}

export const signerService = new SignerService();
