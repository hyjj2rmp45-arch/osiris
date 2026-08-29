import { NextRequest, NextResponse } from 'next/server';
import { telegramBot } from '@/bot/telegram';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import { logger } from '@/lib/logger';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { telegramWebhookSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const ctx = extractRequestContext(request);
  try {
    const signature = request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? '';
    if (!signature) {
      return new NextResponse('Missing Telegram signature header', { status: 400 });
    }

    const rawBody = await request.text();
    const secretToken = process.env.TELEGRAM_BOT_SECRET;
    if (!secretToken) {
      return new NextResponse('Server configuration error', { status: 500 });
    }

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secretToken)
      .update(rawBody)
      .digest('hex');

    const isVerified = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );

    if (!isVerified) {
      return new NextResponse('Invalid Telegram signature', { status: 401 });
    }

    let update: any;
    try {
      update = JSON.parse(rawBody);
    } catch {
      return new NextResponse('Invalid JSON payload', { status: 400 });
    }

    const validated = telegramWebhookSchema.safeParse(update);
    if (!validated.success) {
      return new NextResponse('Invalid Telegram update', { status: 400 });
    }

    try {
      await telegramBot.handleUpdate(validated.data);
      logger.info('[Telegram Webhook] Update processed successfully');
      return new NextResponse('OK', { status: 200 });
    } catch (botError) {
      const message = botError instanceof Error ? botError.message : String(botError);
      await postNtfy('OSIRIS Error', `Telegram webhook error: ${message}`, 'error,telegram', ctx);
      return new NextResponse('Bot processing error', { status: 500 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await postNtfy('OSIRIS Error', `Telegram webhook error: ${message}`, 'error,telegram', ctx);
    return new NextResponse('Unexpected error', { status: 500 });
  }
}

export async function GET() {
  return new NextResponse('Method not allowed', { status: 405 });
}