import { NextRequest, NextResponse } from 'next/server';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import crypto from 'crypto';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { webhookSchema } from '@/lib/validation';

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false;
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const ctx = extractRequestContext(request);
  try {
    const signature = request.headers.get('x-signature') ?? '';
    if (!signature) {
      return new NextResponse('Missing signature header', { status: 400 });
    }

    const rawBody = await request.text();
    if (!verifySignature(rawBody, signature)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new NextResponse('Invalid JSON payload', { status: 400 });
    }

    const validated = webhookSchema.safeParse(payload);
    if (!validated.success) {
      return new NextResponse('Invalid webhook payload', { status: 400 });
    }

    return new NextResponse('Webhook received', { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await postNtfy('OSIRIS Error', `Webhook error: ${message}`, 'error,webhook', ctx);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}