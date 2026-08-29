import { pgTable, serial, text, integer, timestamp, boolean, pgEnum, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// User roles
export const userRoleEnum = pgEnum('user_role', ['user', 'tester', 'admin', 'support']);

// ======================================================================
// Phase 0 — Core Tables
// ======================================================================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  telegramId: text('telegram_id').unique().notNull(),
  username: text('username'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: userRoleEnum('role').default('user').notNull(),
  // Subscription and tier fields per master plan
  tier: text('tier').notNull(), // 'monthly' | 'lifetime'
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  autoRenew: boolean('auto_renew').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  idleExpiry: timestamp('idle_expiry').notNull(),
  revoked: boolean('revoked').default(false).notNull(),
  rotatedFrom: text('rotated_from'),
  lastRotatedAt: timestamp('last_rotated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const wallets = pgTable('wallets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  address: text('address').unique().notNull(),
  encryptedPrivateKey: text('encrypted_private_key').notNull(),
  derivationPath: text('derivation_path').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const ledgerEntries = pgTable('ledger_entries', {
  id: serial('id').primaryKey(),
  walletId: integer('wallet_id').references(() => wallets.id).notNull(),
  amount: integer('amount').notNull(), // lamports (positive = deposit, negative = transfer_out)
  type: text('type').notNull(), // 'deposit' | 'transfer_out' | 'fee' | 'trade'
  signature: text('signature').unique(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const trades = pgTable('trades', {
  id: serial('id').primaryKey(),
  walletId: integer('wallet_id').references(() => wallets.id).notNull(),
  signature: text('signature').unique().notNull(),
  inputMint: text('input_mint').notNull(),
  outputMint: text('output_mint').notNull(),
  inputAmount: integer('input_amount').notNull(),
  outputAmount: integer('output_amount').notNull(),
  fee: integer('fee').notNull(),
  slot: integer('slot').notNull(),
  status: text('status').notNull(), // 'confirmed' | 'failed' | 'pending'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const positions = pgTable('positions', {
  id: serial('id').primaryKey(),
  walletId: integer('wallet_id').references(() => wallets.id).notNull(),
  mint: text('mint').notNull(),
  amount: integer('amount').notNull(),
  avgEntryPrice: integer('avg_entry_price').notNull(), // price in lamports per token
  unrealizedPnl: integer('unrealized_pnl').default(0),
  realizedPnl: integer('realized_pnl').default(0),
  takeProfitPrice: integer('take_profit_price'),
  stopLossPrice: integer('stop_loss_price'),
  trailingStopBps: integer('trailing_stop_bps'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const strategies = pgTable('strategies', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  config: jsonb('config').notNull(),
  isActive: boolean('is_active').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const copyTargets = pgTable('copy_targets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  targetAddress: text('target_address').notNull(),
  label: text('label'),
  copyPercentage: integer('copy_percentage').notNull(), // 1-100 (basis points)
  maxPositionSize: integer('max_position_size').notNull(), // in lamports
  minTradeSize: integer('min_trade_size').notNull(), // in lamports
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userAddressUnique: uniqueIndex('copy_targets_user_address_unique').on(table.userId, table.targetAddress),
}));

export const trackedWallets = pgTable('tracked_wallets', {
  id: serial('id').primaryKey(),
  address: text('address').unique().notNull(),
  label: text('label'),
  tags: jsonb('tags').$type<string[]>(),
  lastSeen: timestamp('last_seen'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  tier: text('tier').notNull(), // 'monthly' | 'lifetime'
  status: text('status').notNull().default('active'), // 'active' | 'suspended' | 'cancelled'
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const paperTrades = pgTable('paper_trades', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  inputMint: text('input_mint').notNull(),
  outputMint: text('output_mint').notNull(),
  inputAmount: integer('input_amount').notNull(),
  outputAmount: integer('output_amount').notNull(),
  simulatedPrice: integer('simulated_price').notNull(),
  pnl: integer('pnl').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // 'price' | 'volume' | 'whale' | 'new_token'
  config: jsonb('config').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bugReports = pgTable('bug_reports', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  severity: text('severity').notNull(), // 'low' | 'medium' | 'high' | 'critical'
  status: text('status').default('open'), // 'open' | 'in_progress' | 'resolved' | 'closed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ======================================================================
// Phase 4 — Automation (Copy Trading, Webhooks)
// ======================================================================

export const webhookEvents = pgTable('webhook_events', {
  id: serial('id').primaryKey(),
  source: text('source').notNull(), // 'helius' | 'pumpportal'
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  signature: text('signature'),
  status: text('status').notNull().default('pending'), // 'pending' | 'processing' | 'completed' | 'failed' | 'dlq'
  attempts: integer('attempts').default(0),
  lastError: text('last_error'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('webhook_events_status_idx').on(table.status),
  sourceTypeIdx: index('webhook_events_source_type_idx').on(table.source, table.eventType),
  createdAtIdx: index('webhook_events_created_at_idx').on(table.createdAt),
}));

export const copyTrades = pgTable('copy_trades', {
  id: serial('id').primaryKey(),
  copyTargetId: integer('copy_target_id').references(() => copyTargets.id).notNull(),
  sourceWallet: text('source_wallet').notNull(),
  targetWallet: text('target_wallet').notNull(),
  inputMint: text('input_mint').notNull(),
  outputMint: text('output_mint').notNull(),
  sourceInputAmount: integer('source_input_amount').notNull(),
  sourceOutputAmount: integer('source_output_amount').notNull(),
  copyInputAmount: integer('copy_input_amount').notNull(),
  copyOutputAmount: integer('copy_output_amount').notNull(),
  signature: text('signature').unique(),
  status: text('status').notNull().default('pending'), // 'pending' | 'simulated' | 'submitted' | 'confirmed' | 'failed'
  error: text('error'),
  latencyMs: integer('latency_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  confirmedAt: timestamp('confirmed_at'),
}, (table) => ({
  targetIdx: index('copy_trades_target_idx').on(table.copyTargetId),
  statusIdx: index('copy_trades_status_idx').on(table.status),
  sourceWalletIdx: index('copy_trades_source_wallet_idx').on(table.sourceWallet),
  createdAtIdx: index('copy_trades_created_at_idx').on(table.createdAt),
}));

// ======================================================================
// Phase 5 — Safety & Compliance
// ======================================================================

export const circuitBreakerState = pgTable('circuit_breaker_state', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  rollingLoss: integer('rolling_loss').default(0), // lamports
  consecutiveLosses: integer('consecutive_losses').default(0),
  isTripped: boolean('is_tripped').default(false),
  trippedAt: timestamp('tripped_at'),
  overrideExpiresAt: timestamp('override_expires_at'),
  lastTradeAt: timestamp('last_trade_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('circuit_breaker_user_idx').on(table.userId),
  trippedIdx: index('circuit_breaker_tripped_idx').on(table.isTripped),
}));

export const taxLots = pgTable('tax_lots', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  walletId: integer('wallet_id').references(() => wallets.id).notNull(),
  mint: text('mint').notNull(),
  amount: integer('amount').notNull(), // remaining quantity
  originalAmount: integer('original_amount').notNull(),
  costBasis: integer('cost_basis').notNull(), // total cost in lamports
  costBasisUsd: integer('cost_basis_usd').default(0), // cost basis in USD cents
  acquisitionDate: timestamp('acquisition_date').defaultNow().notNull(),
  acquisitionPrice: integer('acquisition_price').notNull(), // price per token in lamports
  acquisitionSlot: integer('acquisition_slot'),
  isClosed: boolean('is_closed').default(false),
  closedAt: timestamp('closed_at'),
  realizedPnl: integer('realized_pnl').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('tax_lots_user_idx').on(table.userId),
  walletIdx: index('tax_lots_wallet_idx').on(table.walletId),
  mintIdx: index('tax_lots_mint_idx').on(table.mint),
  openIdx: index('tax_lots_open_idx').on(table.isClosed),
}));

export const tokenMetadata = pgTable('token_metadata', {
  id: serial('id').primaryKey(),
  mint: text('mint').unique().notNull(),
  name: text('name'),
  symbol: text('symbol'),
  decimals: integer('decimals'),
  logoUri: text('logo_uri'),
  price: integer('price'), // in lamports per token (scaled by decimals)
  priceUsd: integer('price_usd'), // in USD cents
  isToken2022: boolean('is_token_2022').default(false),
  riskScore: integer('risk_score'), // 0-100 from RugCheck
  mintAuthority: text('mint_authority'),
  freezeAuthority: text('freeze_authority'),
  transferHookProgramId: text('transfer_hook_program_id'),
  isAuthoritySafe: boolean('is_authority_safe').default(true),
  safetyScore: integer('safety_score').default(100),
  lastFetchedAt: timestamp('last_fetched_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  mintIdx: uniqueIndex('token_metadata_mint_unique').on(table.mint),
  priceIdx: index('token_metadata_price_idx').on(table.price),
}));

export const rateLimits = pgTable('rate_limits', {
  id: serial('id').primaryKey(),
  identifier: text('identifier').notNull(), // userId, IP, or API key
  action: text('action').notNull(), // 'trade' | 'copy' | 'webhook' | 'auth' | 'api'
  count: integer('count').default(0),
  windowStart: timestamp('window_start').defaultNow().notNull(),
  windowEnd: timestamp('window_end').notNull(),
  isBlocked: boolean('is_blocked').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  identifierActionIdx: uniqueIndex('rate_limits_identifier_action_unique').on(table.identifier, table.action),
  windowIdx: index('rate_limits_window_idx').on(table.windowStart, table.windowEnd),
  blockedIdx: index('rate_limits_blocked_idx').on(table.isBlocked),
}));

export const velocityLimits = pgTable('velocity_limits', {
  id: serial('id').primaryKey(),
  identifier: text('identifier').notNull(), // userId or walletId
  action: text('action').notNull(), // 'trade' | 'copy' | 'webhook' | 'auth' | 'api'
  dailyCount: integer('daily_count').default(0).notNull(),
  dailyLimit: integer('daily_limit').notNull().default(10),
  windowDate: timestamp('window_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  identifierActionDateIdx: uniqueIndex('velocity_limits_identifier_action_date_unique').on(table.identifier, table.action, sql`date_trunc('day', ${table.windowDate})`),
}));

export const tradeIntents = pgTable('trade_intents', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  walletId: integer('wallet_id').references(() => wallets.id).notNull(),
  status: text('status').notNull().default('pending'), // pending | queued | building | signing | submitted | confirmed | failed | canceled
  inputMint: text('input_mint').notNull(),
  outputMint: text('output_mint').notNull(),
  inputAmount: integer('input_amount').notNull(),
  slippageBps: integer('slippage_bps').notNull().default(50),
  priorityFeeLamports: integer('priority_fee_lamports').default(0),
  txSignature: text('tx_signature').unique(),
  error: text('error'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  takeProfitPrice: integer('take_profit_price'),
  stopLossPrice: integer('stop_loss_price'),
  trailingStopBps: integer('trailing_stop_bps'),
  orderType: text('order_type').default('market'), // 'market' | 'limit' | 'oco'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('trade_intents_status_idx').on(table.status),
  userIdx: index('trade_intents_user_idx').on(table.userId),
  walletIdx: index('trade_intents_wallet_idx').on(table.walletId),
}));

export const multisigProposals = pgTable('multisig_proposals', {
  id: serial('id').primaryKey(),
  proposalType: text('proposal_type').notNull(), // 'halt_recovery' | 'fee_change' | 'tier_change' | 'migration' | 'signer_policy'
  title: text('title').notNull(),
  description: text('description'),
  payload: jsonb('payload').notNull(), // operation-specific data
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected' | 'executed' | 'expired'
  threshold: integer('threshold').default(2).notNull(), // required signatures
  totalSigners: integer('total_signers').default(3).notNull(),
  signatures: jsonb('signatures').$type<{ signerId: string; signature: string; timestamp: number }[]>().default([]),
  proposerId: text('proposer_id').notNull(),
  executedAt: timestamp('executed_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('multisig_proposals_status_idx').on(table.status),
  typeIdx: index('multisig_proposals_type_idx').on(table.proposalType),
  expiresIdx: index('multisig_proposals_expires_idx').on(table.expiresAt),
}));

export const killSwitchEvents = pgTable('kill_switch_events', {
  id: serial('id').primaryKey(),
  eventType: text('event_type').notNull(), // 'engaged' | 'recovery_proposed' | 'recovery_confirmed' | 'recovered' | 'trigger_evaluated'
  trigger: text('trigger'), // circuit_breaker, rate_limit, sim_failure, admin_panic, telegram_halt
  source: text('source').notNull(),
  details: jsonb('details'),
  status: text('status').notNull(), // 'success' | 'failed' | 'skipped'
  requestId: text('request_id').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  typeIdx: index('kill_switch_events_type_idx').on(table.eventType),
  triggerIdx: index('kill_switch_events_trigger_idx').on(table.trigger),
  createdAtIdx: index('kill_switch_events_created_at_idx').on(table.createdAt),
}));

export const notificationEvents = pgTable('notification_events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  severity: text('severity').notNull(), // critical | high | medium | low
  source: text('source').notNull(),
  channel: text('channel').notNull(), // telegram | sse | sms | ntfy
  status: text('status').default('pending').notNull(), // pending | sent | failed
  error: text('error'),
  requestId: text('request_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index('notification_events_source_idx').on(table.source),
  severityIdx: index('notification_events_severity_idx').on(table.severity),
  channelIdx: index('notification_events_channel_idx').on(table.channel),
  createdAtIdx: index('notification_events_created_at_idx').on(table.createdAt),
}));

// ======================================================================
// Phase 3 — Payments & Subscriptions
// ======================================================================

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  tier: text('tier').notNull(), // 'monthly' | 'lifetime'
  token: text('token').notNull(), // 'SOL' | 'USDC'
  amount: integer('amount').notNull(), // in native units (lamports or USDC raw)
  signature: text('signature').unique().notNull(),
  fromAddress: text('from_address').notNull(),
  toAddress: text('to_address').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'confirmed' | 'failed'
  blockTime: timestamp('block_time'),
  slot: integer('slot'),
  error: text('error'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('payments_user_id_idx').on(table.userId),
  signatureIdx: index('payments_signature_idx').on(table.signature),
  statusIdx: index('payments_status_idx').on(table.status),
  createdAtIdx: index('payments_created_at_idx').on(table.createdAt),
}));

// ======================================================================
// Phase 5 — Security, Audit, and Compliance
// ======================================================================

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  level: text('level').notNull(), // info | warn | error
  event: text('event').notNull(),
  correlationId: text('correlation_id'),
  userId: integer('user_id').references(() => users.id),
  env: text('env').notNull(),
  network: text('network').notNull(),
  metadata: jsonb('metadata'),
}, (table) => ({
  eventIdx: index('audit_logs_event_idx').on(table.event),
  userIdx: index('audit_logs_user_idx').on(table.userId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.timestamp),
}));

export const securityEvents = pgTable('security_events', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  level: text('level').notNull(), // info | warn | error | critical
  event: text('event').notNull(),
  correlationId: text('correlation_id'),
  userId: integer('user_id').references(() => users.id),
  env: text('env').notNull(),
  network: text('network').notNull(),
  metadata: jsonb('metadata'),
}, (table) => ({
  eventIdx: index('security_events_event_idx').on(table.event),
  userIdx: index('security_events_user_idx').on(table.userId),
  createdAtIdx: index('security_events_created_at_idx').on(table.timestamp),
}));

export const featureFlags = pgTable('feature_flags', {
  id: serial('id').primaryKey(),
  key: text('key').unique().notNull(),
  enabled: boolean('enabled').default(false).notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ======================================================================
// Phase 5 — Immutable Audit Trail
// ======================================================================

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  eventType: text('event_type').notNull(),
  telegramId: integer('telegram_id'),
  userId: integer('user_id'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  reason: text('reason'),
  metadata: jsonb('metadata'),
  previousHash: text('previous_hash'),
  entryHash: text('entry_hash'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  eventTypeIdx: index('audit_log_event_type_idx').on(table.eventType),
  userIdx: index('audit_log_user_idx').on(table.userId),
  createdAtIdx: index('audit_log_created_at_idx').on(table.createdAt),
}));
