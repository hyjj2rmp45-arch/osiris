/**
 * Shared validation schemas for trade intents.
 *
 * These schemas are used by both the API routes and tests.
 * They are kept internal to the route files but re-exported here
 * for testability.
 */

import { z } from 'zod';

// The schema that's used in POST /api/trade-intents route
export const createTradeIntentSchema = z.object({
  walletId: z.number().int().positive(),
  inputMint: z.string().min(32),
  outputMint: z.string().min(32),
  inputAmount: z.number().positive(),
  slippageBps: z.coerce.number().int().positive().max(1000).default(50),
  priorityFeeLamports: z.coerce.number().int().nonnegative().default(0),
});

// The schema that's used in PATCH /api/trade-intents/[id] route
export const updateTradeIntentStatusSchema = z.object({
  status: z.enum(['pending', 'queued', 'building', 'signing', 'submitted', 'confirmed', 'failed', 'canceled']),
  metadata: z.object({
    error: z.string().optional(),
    signature: z.string().optional(),
  }).optional(),
});