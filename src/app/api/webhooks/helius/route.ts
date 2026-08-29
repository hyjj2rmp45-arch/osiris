import { NextRequest, NextResponse } from 'next/server';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import crypto from 'crypto';
import { z } from 'zod';
import { CircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';
import { assertSignedIn } from '@/lib/route-auth';
import { redis } from '@/lib/redis';

const circuitBreaker = new CircuitBreaker({
  safetyMargin: 10,
  maxConsecutiveFailures: 5,
  cooldownMs: 60 * 1000,
});

const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const expected = Buffer.from(hmac, 'hex');
  const provided = Buffer.from(signature, 'hex');
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

function verifyWebhookTimestamp(timestamp: number): boolean {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  return diff <= WEBHOOK_TIMESTAMP_TOLERANCE_MS;
}

async function isIdempotent(nonce: string): Promise<boolean> {
  const client = redis;
  const key = `webhook:nonce:${nonce}`;
  const exists = await client.get(key);
  if (exists) return false;
  await client.setex(key, 60 * 60, '1'); // 1 hour TTL
  return true;
}

const heliusSchema = z.object({
  signature: z.string(),
  slot: z.number().int(),
  timestamp: z.number().int(),
  events: z.array(z.record(z.unknown())),
});

const pumpTradeSchema = z.object({
  mint: z.string(),
  creator: z.string(),
  name: z.string(),
  symbol: z.string(),
  uri: z.string(),
  timestamp: z.number().int(),
});

async function notifyNtfy(title: string, message: string, tags = 'error,webhook', ctx: ReturnType<typeof extractRequestContext>): Promise<void> {
  await postNtfy(title, message, tags, ctx);
}

export async function POST(request: NextRequest) {
  const unauthorized = assertSignedIn(request);
  if (unauthorized) return unauthorized;
  const ctx = extractRequestContext(request);
  const startTime = Date.now();

  try {
    const signature = request.headers.get('x-signature') || request.headers.get('x-helio-signature') || '';
    if (!signature) {
      await notifyNtfy('OSIRIS Error', 'Helius webhook error: Missing signature header', 'error,helius', ctx);
      return NextResponse.json({ error: 'Missing signature header' }, { status: 400 });
    }

    const rawBody = await request.text();
    if (!verifySignature(rawBody, signature)) {
      await notifyNtfy('OSIRIS Error', 'Helius webhook error: Signature verification failed', 'error,helius', ctx);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await notifyNtfy('OSIRIS Error', `Helius webhook error: JSON parse error: ${msg}`, 'error,helius', ctx);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const webhookTimestamp = payload.timestamp;
    if (typeof webhookTimestamp !== 'number' || !verifyWebhookTimestamp(webhookTimestamp)) {
      await notifyNtfy('OSIRIS Error', 'Helius webhook error: Timestamp outside tolerance', 'error,helius', ctx);
      return NextResponse.json({ error: 'Request expired' }, { status: 401 });
    }

    const webhookNonce = payload.nonce || payload.id || payload.event_id;
    if (webhookNonce && !(await isIdempotent(String(webhookNonce)))) {
      await notifyNtfy('OSIRIS Error', 'Helius webhook error: Duplicate event detected', 'error,helius', ctx);
      return NextResponse.json({ error: 'Duplicate event' }, { status: 409 });
    }

    const source = signature.startsWith('wh.') ? 'helius' : 'pumpportal';
    const eventType = payload.event_type || payload.type || 'unknown';
    const eventSchema = source === 'helius' ? heliusSchema : pumpTradeSchema;

    const validated = eventSchema.safeParse(payload);
    if (!validated.success) {
      const details = validated.error.issues.map((i: any) => i.message).join(', ');
      await notifyNtfy('OSIRIS Error', `Helius webhook error: Payload validation failed: ${details}`, 'error,helius', ctx);
      return NextResponse.json({ error: 'Invalid payload structure', details: validated.error.issues }, { status: 400 });
    }

    const duration = Date.now() - startTime;
    logger.info(`Helius webhook processed successfully in ${duration}ms`);

    return NextResponse.json({ status: 'received', eventType }, { status: 202 });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`Helius webhook error after ${duration}ms:`, error);

    if (circuitBreaker.isEngaged()) {
      await notifyNtfy('OSIRIS Error', `Circuit breaker half-open: helius-webhook`, 'error,circuit-breaker', ctx);
      return NextResponse.json({
        error: 'Service temporarily unavailable due to circuit breaker',
        retryAfter: circuitBreaker.getState().cooldownRemaining,
      }, { status: 503 });
    }

    const message = error.message || 'Internal error';
    await notifyNtfy('OSIRIS Error', `Helius webhook error: ${message}`, 'error,helius', ctx);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'helius-webhook' });
}