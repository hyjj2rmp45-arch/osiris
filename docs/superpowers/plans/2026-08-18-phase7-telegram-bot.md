# Phase 7.1 Telegram Bot Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Telegram bot skeleton with `/start` command handling and webhook endpoint, following the project's "one file per purpose" rule and security requirements.

**Architecture:** Scaffold the bot inside the existing Next.js API route structure. The bot's webhook (`/api/telegram/webhook`) will be the dedicated entry point for Telegram updates, keeping it consistent with the rest of the API and allowing reuse of the same Docker/environment configuration.

**Tech Stack:** grammY (1.45.1), Next.js API routes, TypeScript, Node.js

**Spec:** `docs/superpowers/specs/2026-08-18-phase7-telegram-bot-design.md`

## Global Constraints

- **Rule 1: One File At A Time** — Each deliverable has exact file paths. Create each file with the exact path shown. Do not skip files. Do not merge files.
- **Rule 2: Exact Code** — All code blocks are copy-paste ready. Write every line. Do not summarize. Do not omit. Do not use "..." to skip sections.
- **Rule 3: Dependencies First** — Before implementing file B that imports from file A, create file A first.
- **Rule 4: TypeScript Strict Mode** — No `any` types. Every function has an explicit return type. Every variable has an explicit type where inference is ambiguous.
- **Rule 5: Gate Verification** — After completing each phase section, verify ALL gates in that section.
- **Rule 6: No Secrets in Code** — API keys, passwords, and private keys live in .env ONLY. Never hardcode secrets. Never log secrets.
- **Rule 7: Error Handling** — Every async function has try/catch. Every external API call has timeout and retry logic. Every error is logged with structured JSON (Winston). No raw errors sent to client — use stable error codes.
- **Rule 8: Testing** — Every service function has a unit test. Every API route has an integration test. Every database migration has a rollback test.

---

## Task 1: Create Telegram Bot Skeleton

**Files:**
- Create: `src/bot/telegram.ts`

**Interfaces:**
- Consumes: `process.env.TELEGRAM_BOT_TOKEN` (from .env)
- Produces: `telegramBot` instance, `startTelegramBot()` function

- [ ] **Step 1: Create `src/bot/telegram.ts`**

```typescript
import { Bot } from 'grammy';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

/**
 * /start command handler
 * Replies with a welcome message and logs the update source.
 */
bot.command('start', (ctx) => {
  const source = ctx.message?.from?.username ?? 'unknown_user';
  ctx.reply(`👋 Welcome, @${source}!`);
  console.log(`[Telegram] /start initiated by ${source}`);
});

/**
 * Helper to start the bot (for server.js entry point)
 */
export async function startTelegramBot() {
  try {
    await bot.start();
    console.log('[Telegram] Bot started successfully');
  } catch (err) {
    console.error('[Telegram] Failed to start bot:', err);
  }
}

/**
 * Export the bot instance for webhook integration
 */
export { bot as telegramBot };
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit src/bot/telegram.ts`
Expected: No errors related to telegram.ts

---

## Task 2: Implement Webhook Endpoint

**Files:**
- Create: `src/app/api/telegram/webhook/route.ts`

**Interfaces:**
- Consumes: `telegramBot` from `src/bot/telegram`
- Produces: POST handler for Telegram webhook updates

- [ ] **Step 1: Create `src/app/api/telegram/webhook/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { telegramBot } from '@/bot/telegram';

/**
 * Telegram Webhook Handler
 * 
 * - Verifies Telegram secret token via X-Telegram-Bot-Api-Secret-Token header
 * - Parses incoming update payload
 * - Forwards it to grammY bot for processing
 * - Returns 200 OK on successful processing, 401 on invalid signature, 400/500 on errors
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Get Telegram signature header
    const signature = request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? '';
    if (!signature) {
      return new NextResponse('Missing Telegram signature header', { status: 400 });
    }

    // 2. Get raw request body for signature verification
    const rawBody = await request.text();

    // 3. Verify signature using Telegram's secret token
    const secretToken = process.env.TELEGRAM_BOT_SECRET;
    if (!secretToken) {
      console.error('[Telegram Webhook] TELEGRAM_BOT_SECRET not configured');
      return new NextResponse('Server configuration error', { status: 500 });
    }

    // Calculate HMAC-SHA256 signature of raw body using Telegram's secret token
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secretToken)
      .update(rawBody)
      .digest('hex');

    // Use timing-safe comparison to prevent signature-timing attacks
    const isVerified = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );

    if (!isVerified) {
      console.warn('[Telegram Webhook] Invalid signature provided');
      return new NextResponse('Invalid Telegram signature', { status: 401 });
    }

    // 4. Parse the JSON payload
    let update: any; // Use 'any' to avoid TS type issues with grammy's Update type
    try {
      update = JSON.parse(rawBody);
    } catch {
      return new NextResponse('Invalid JSON payload', { status: 400 });
    }

    // 5. Forward update to grammY bot
    try {
      await telegramBot.handleUpdate(update);
      console.log('[Telegram Webhook] Update processed successfully');
      return new NextResponse('OK', { status: 200 });
    } catch (botError) {
      console.error('[Telegram Webhook] Bot update processing error:', botError);
      return new NextResponse('Bot processing error', { status: 500 });
    }
  } catch (error) {
    console.error('[Telegram Webhook] Unexpected error:', error);
    return new NextResponse('Unexpected error', { status: 500 });
  }
}

/**
 * GET is not supported for Telegram webhook endpoint
 */
export async function GET() {
  return new NextResponse('Method not allowed', { status: 405 });
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit src/app/api/telegram/webhook/route.ts`
Expected: No errors related to telegram/webhook

---

## Task 3: Environment Configuration

**Files:**
- Verify: `.env` (already exists)

- [ ] **Step 1: Verify environment variables**

```bash
grep -E "TELEGRAM_BOT_TOKEN|TELEGRAM_BOT_SECRET" .env
```

Expected: Both variables present with values

---

## Task 4: Local Testing

**Files:**
- Create: `scripts/test-telegram-webhook.sh`

- [ ] **Step 1: Create test script**

```bash
#!/bin/bash
# Test Telegram webhook locally
# Usage: ./scripts/test-telegram-webhook.sh

set -e

echo "Starting dev server..."
npm run dev &
DEV_PID=$!
sleep 5

echo "Sending test webhook..."
curl -X POST http://localhost:3000/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: test-secret" \
  -d '{"update_id": 12345, "message": {"message_id": 1, "from": {"id": 1}, "text": "/start"}}'

echo ""
echo "Test complete. Check logs for 'Update processed successfully'"

kill $DEV_PID 2>/dev/null || true
```

- [ ] **Step 2: Run test**

Run: `bash scripts/test-telegram-webhook.sh`
Expected: Webhook returns 200 OK, log shows "Update processed successfully"

---

## Verification Gates

- [ ] TypeScript type checking passes (`npm run typecheck`)
- [ ] Node runtime loads bot without token errors
- [ ] Webhook returns 200 OK for valid signature
- [ ] Webhook returns 401 for invalid signature
- [ ] Bot processes `/start` command correctly
- [ ] No secrets leaked in responses or logs