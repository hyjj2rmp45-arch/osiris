import { z } from 'zod';

export const alertQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
  severity: z.enum(['info', 'warn', 'error', 'critical']).optional(),
  maxAge: z.coerce.number().int().positive().optional(),
});

export const copyTradeSchema = z.object({
  sourceWallet: z.string().min(32),
  inputMint: z.string().min(32),
  outputMint: z.string().min(32),
  inputAmount: z.number().positive(),
});

export const copyTargetCreateSchema = z.object({
  targetAddress: z.string().min(32),
  label: z.string().optional(),
  copyPercentage: z.number().positive(),
  maxPositionSize: z.number().positive(),
  minTradeSize: z.number().positive(),
});

export const copyTargetUpdateSchema = z.object({
  targetAddress: z.string().min(32).optional(),
  label: z.string().optional(),
  copyPercentage: z.number().positive().optional(),
  maxPositionSize: z.number().positive().optional(),
  minTradeSize: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export const killswitchSchema = z.object({
  reason: z.string().optional(),
  initiatedBy: z.string().optional(),
});

export const rateLimitOverrideSchema = z.object({
  identifier: z.string().min(1),
  action: z.enum(['trade', 'copy', 'webhook', 'auth', 'api']),
  ttlSeconds: z.coerce.number().int().positive().max(86400).optional(),
});

export const webhookBaseSchema = z.object({
  secret: z.string().optional(),
  source: z.string().optional(),
});

export const taxLotSellSchema = z.object({
  lotId: z.number().int().positive(),
  amount: z.number().positive(),
  price: z.number().positive(),
  mint: z.string().min(32),
  walletId: z.number().int().positive(),
});

export const alertPatchSchema = z.object({
  id: z.number().int().positive(),
  status: z.string().min(1),
});

export const feeComputeSchema = z.object({
  type: z.string().min(1),
  amount: z.number().nonnegative(),
  walletId: z.number().int().positive().optional(),
});

export const killswitchEngageSchema = z.object({
  trigger: z.enum(['circuit_breaker', 'rate_limit', 'sim_failure', 'admin_panic', 'telegram_halt']),
  source: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
  confirmation: z.string().optional(),
});

export const killswitchRecoverySchema = z.object({
  action: z.enum(['propose', 'confirm']),
  adminId: z.string().min(1),
  confirmation: z.string().optional(),
});

export const multisigCreateSchema = z.object({
  proposalType: z.string().min(1).default('halt_recovery'),
  title: z.string().min(1),
  description: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  expiresAt: z.number().int().positive().optional(),
});

export const multisigSignSchema = z.object({
  signature: z.string().min(1),
});

export const rugcheckSchema = z.object({
  mint: z.string().min(32),
});

export const webhookSchema = z.object({
  source: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export const solanaUpgradeSchema = z.object({
  action: z.enum(['initiate', 'validate']),
  programId: z.string().min(32),
  newAuthority: z.string().min(32).optional(),
});

export const telegramWebhookSchema = z.object({
  update_id: z.number().int().positive(),
  message: z.record(z.string(), z.unknown()).optional(),
  callback_query: z.record(z.string(), z.unknown()).optional(),
});
