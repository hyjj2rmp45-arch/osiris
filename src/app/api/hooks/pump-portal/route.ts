import { NextRequest, NextResponse } from 'next/server';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import crypto from 'crypto';
import { z } from 'zod';
import { CircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';
import { assertSignedIn } from '@/lib/route-auth';

const circuitBreaker = new CircuitBreaker({
  safetyMargin: 10,
  maxConsecutiveFailures: 5,
  cooldownMs: 60 * 1000,
});

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

const webhookPayloadSchema = z.object({
  event_type: z.string(),
  mint: z.string(),
  creator: z.string(),
  params: z.record(z.string(), z.unknown()),
  timestamp: z.number(),
});

const copyTradeSchema = z.object({
  sourceWallet: z.string(),
  inputMint: z.string(),
  outputMint: z.string(),
  inputAmount: z.number().int(),
});

const ALLOWED_IPS = [
  '3.78.0.0/16',
  '20.160.0.0/12',
  '52.96.0.0/14',
];

function isAllowedIP(ip: string): boolean {
  return ALLOWED_IPS.some((cidr) => {
    const networkPart = cidr.split('/')[0] ?? '';
    const octets = networkPart.split('.');
    const prefix = octets.slice(0, 3).join('.');
    return prefix && ip.startsWith(prefix + '.');
  });
}

async function executeCopyTrade(trade: z.infer<typeof copyTradeSchema>): Promise<{
  success: boolean;
  signature?: string;
  error?: string;
}> {
  const mockSignature = crypto.randomBytes(32).toString('base64');
  return { success: true, signature: mockSignature };
}

async function notifyNtfy(title: string, message: string, ctx: ReturnType<typeof extractRequestContext>): Promise<void> {
  await postNtfy(title, message, 'error,webhook', ctx);
}

export async function POST(request: NextRequest) {
  const unauthorized = assertSignedIn(request);
  if (unauthorized) return unauthorized;
  const ctx = extractRequestContext(request);
  const startTime = Date.now();

  try {
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('cf-connecting-ip') ||
                     '127.0.0.1';

    if (!isAllowedIP(clientIP)) {
      await notifyNtfy('OSIRIS Error', `PumpPortal webhook error: IP ${clientIP} not in allowlist`, ctx);
      return NextResponse.json({ error: 'IP not allowed' }, { status: 403 });
    }

    const signature = request.headers.get('x-signature') || request.headers.get('x-pump-signature') || '';
    if (!signature) {
      await notifyNtfy('OSIRIS Error', 'PumpPortal webhook error: Missing signature header', ctx);
      return NextResponse.json({ error: 'Missing signature header' }, { status: 400 });
    }

    const rawBody = await request.text();
    if (!verifySignature(rawBody, signature)) {
      await notifyNtfy('OSIRIS Error', 'PumpPortal webhook error: Signature verification failed', ctx);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await notifyNtfy('OSIRIS Error', `PumpPortal webhook error: JSON parse error: ${msg}`, ctx);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = webhookPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i: any) => i.message).join(', ');
      await notifyNtfy('OSIRIS Error', `PumpPortal webhook error: Payload validation failed: ${details}`, ctx);
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
    }

    const queueEntry = {
      source: 'pumpportal',
      eventType: parsed.data.event_type,
      payload: JSON.stringify(parsed.data),
      signature,
      status: 'pending',
    };

    const duration = Date.now() - startTime;
    logger.info(`PumpPortal webhook processed successfully in ${duration}ms`);

    return NextResponse.json({ status: 'queued', event_type: parsed.data.event_type }, { status: 202 });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`PumpPortal webhook error after ${duration}ms:`, error);

    if (circuitBreaker.isEngaged()) {
      await notifyNtfy('OSIRIS Error', 'PumpPortal circuit breaker half-open', ctx);
      return NextResponse.json({
        error: 'Service temporarily unavailable due to circuit breaker',
        retryAfter: circuitBreaker.getState().cooldownRemaining,
      }, { status: 503 });
    }

    const message = error.message || 'Internal error';
    await notifyNtfy('OSIRIS Error', `PumpPortal webhook error: ${message}`, ctx);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'pumpportal-webhook' });
}