# Phase 7.1 Implementation Plan: Telegram Bot Integration (Option 2 - Scaffold in Next.js API Routes)

## Goal
Integrate a Telegram bot using grammY and Next.js API routes, following the project's "one file per purpose" rule and security requirements.

## Scope
1. Create Telegram bot skeleton with `/start` command handling
2. Implement webhook endpoint for Telegram updates
3. Ensure proper signature verification and error handling
4. Maintain existing project structure and environment configuration

## Deliverables
- `src/bot/telegram.ts` - Bot initialization and command handler
- `src/app/api/telegram/webhook/route.ts` - Webhook verification and update forwarding
- Updated `.env` documentation (already exists)
- Test script for local verification

## Step-by-Step Tasks

### Task 1: Create Bot Skeleton
1.1 Create `src/bot/telegram.ts` with:
- `Bot` initialization using `process.env.TELEGRAM_BOT_TOKEN`
- `/start` command handler that replies with welcome message
- Logging of update source
- `startTelegramBot()` helper function
- Export bot instance as `telegramBot`

### Task 2: Implement Webhook Endpoint
2.1 Create `src/app/api/telegram/webhook/route.ts` with:
- Import of `telegramBot` from `src/bot/telegram`
- Signature verification using `X-Telegram-Bot-Api-Secret-Token` header
- Raw body parsing for signature validation
- JSON payload parsing with proper typing
- Update forwarding to `telegramBot.handleUpdate()`
- Error handling for missing headers, invalid signatures, and JSON parsing
- Basic success/failure response handling

### Task 3: Environment Configuration
3.1 Verify `.env` contains:
- `TELEGRAM_BOT_TOKEN` (already present)
- `TELEGRAM_BOT_SECRET` (must be set for production)

### Task 4: Local Testing
4.1 Start dev server: `npm run dev`
4.2 Send test webhook payload using curl:
```bash
curl -X POST http://localhost:3000/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: test-secret" \
  -d '{"update_id": 12345, "message": {"message_id": 1, "from": {"id": 1}, "text": "/start"}}'
```
4.3 Verify log output shows "Update processed successfully"

### Task 5: Production Readiness
5.1 Ensure error handling follows project standards (fail closed, proper logging)
5.2 Verify no secret leakage in responses
5.3 Confirm adherence to Next.js API route conventions

## Dependencies
- `grammy` (installed)
- Existing `.env` configuration (already set)

## Verification Gates
- TypeScript type checking passes
- Node runtime loads bot without token errors
- Webhook returns 200 OK for valid signature
- Webhook returns 401 for invalid signature
- Bot processes `/start` command correctly