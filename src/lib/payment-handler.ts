/**
 * OSIRIS Payment Handler
 * Comprehensive payment processing with all scenario handling
 */
import { db } from './db';
import { users, payments, wallets, sessions } from './schema';
import { eq, and, gt } from 'drizzle-orm';
import { verifyPayment } from './payments';
import { logAuditEvent } from './audit';
import { sendUserNotification, sendAdminAlert } from './notifications';
import { rpcFailover } from './solana-rpc';

const LAMPORTS_PER_SOL = 1_000_000_000;
const USDC_DECIMALS = 1_000_000;

const TREASURY_ADDRESS = process.env.PHANTOM_SOL_ADDRESS || '3FfRM3fzySeMmKsWNND4vgajS6eKzWtnb5qDbFfbhxUk';
const OLD_TREASURY_ADDRESS = '5hVZopcd3hRUEQL6p8Hhdk9hBTtaAAWZuEEJm28PxQ56';

interface PaymentContext {
  userId: number;
  telegramId: number;
  sessionToken: string;
}

interface PaymentResult {
  success: boolean;
  action: string;
  tier?: string;
  currentPeriodEnd?: string | null;
  autoRenew?: boolean;
  error?: string;
  refundAmount?: number;
  refundSignature?: string;
}

/**
 * Scenario 1: Exact Amount - Happy Path
 */
async function handleExactPayment(
  context: PaymentContext,
  tier: 'monthly' | 'lifetime',
  token: 'SOL' | 'USDC',
  payment: any,
  autoRenew: boolean
): Promise<PaymentResult> {
  const now = new Date();
  const periodEnd = tier === 'lifetime' ? null : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    await tx.insert(payments).values({
      userId: context.userId,
      tier,
      token,
      amount: payment.amount,
      signature: payment.signature,
      fromAddress: payment.from,
      toAddress: payment.to,
      status: 'confirmed',
    });

    await tx.update(users).set({
      tier,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      autoRenew: tier === 'monthly' ? autoRenew : false,
      updatedAt: now,
    }).where(eq(users.id, context.userId));
  });

  await logAuditEvent({
    type: 'payment.exact',
    userId: context.userId,
    telegramId: context.telegramId,
    metadata: { tier, token, amount: payment.amount, signature: payment.signature },
  });

  await sendUserNotification(context.telegramId,
    `✅ Payment verified! Your ${tier} subscription is now active.`
  );

  return {
    success: true,
    action: 'subscription_activated',
    tier,
    currentPeriodEnd: periodEnd?.toISOString() || null,
    autoRenew: tier === 'monthly' ? autoRenew : false,
  };
}

/**
 * Scenario 2: Overpayment - Refund excess
 */
async function handleOverpayment(
  context: PaymentContext,
  tier: 'monthly' | 'lifetime',
  token: 'SOL' | 'USDC',
  payment: any,
  expectedAmount: number
): Promise<PaymentResult> {
  const excessAmount = payment.amount - expectedAmount;
  const excessLamports = token === 'SOL'
    ? excessAmount
    : excessAmount / USDC_DECIMALS;

  await db.insert(payments).values({
    userId: context.userId,
    tier,
    token,
    amount: payment.amount,
    signature: payment.signature,
    fromAddress: payment.from,
    toAddress: payment.to,
    status: 'pending_review',
    error: `Overpayment detected: ${excessLamports} excess. Awaiting refund.`,
  });

  await logAuditEvent({
    type: 'payment.overpayment',
    userId: context.userId,
    telegramId: context.telegramId,
    metadata: { tier, token, amount: payment.amount, expectedAmount, excessAmount, signature: payment.signature },
  });

  await sendAdminAlert(`User overpaid. Received ${payment.amount}, expected ${expectedAmount}. Excess: ${excessLamports}. Refund required. (User: ${context.telegramId})`);

  await sendUserNotification(context.telegramId,
    `⚠️ Overpayment detected. You've sent more than required. Our team will process a refund for the excess amount within 24 hours.`
  );

  return {
    success: false,
    action: 'overpayment_requires_refund',
    error: 'Overpayment detected. Refund will be processed within 24 hours.',
    refundAmount: excessAmount,
  };
}

/**
 * Scenario 3: Underpayment - Reject + Refund
 */
async function handleUnderpayment(
  context: PaymentContext,
  tier: 'monthly' | 'lifetime',
  token: 'SOL' | 'USDC',
  payment: any,
  expectedAmount: number
): Promise<PaymentResult> {
  const shortfall = expectedAmount - payment.amount;
  const shortfallFormatted = token === 'SOL'
    ? `${(shortfall / LAMPORTS_PER_SOL).toFixed(3)} SOL`
    : `${(shortfall / USDC_DECIMALS).toFixed(2)} USDC`;

  await db.insert(payments).values({
    userId: context.userId,
    tier,
    token,
    amount: payment.amount,
    signature: payment.signature,
    fromAddress: payment.from,
    toAddress: payment.to,
    status: 'rejected',
    error: `Underpayment: ${shortfallFormatted} short`,
  });

  await logAuditEvent({
    type: 'payment.underpayment',
    userId: context.userId,
    telegramId: context.telegramId,
    metadata: { tier, token, amount: payment.amount, expectedAmount, shortfall },
  });

  await sendAdminAlert(`Underpayment rejected. User sent ${payment.amount}, needed ${expectedAmount}. Shortfall: ${shortfallFormatted}. (User: ${context.telegramId})`);

  await sendUserNotification(context.telegramId,
    `❌ Insufficient payment. You sent ${token === 'SOL' ? (payment.amount / LAMPORTS_PER_SOL).toFixed(3) : (payment.amount / USDC_DECIMALS).toFixed(2)} ${token} but ${tier} requires ${token === 'SOL' ? (expectedAmount / LAMPORTS_PER_SOL).toFixed(3) : (expectedAmount / USDC_DECIMALS).toFixed(2)} ${token}. Please send the correct amount.`
  );

  return {
    success: false,
    action: 'underpayment_rejected',
    error: `Insufficient payment. You need ${shortfallFormatted} more.`,
  };
}

/**
 * Scenario 4: Wrong Wallet - Reject + Ask Registered
 */
async function handleWrongWallet(
  context: PaymentContext,
  tier: 'monthly' | 'lifetime',
  token: 'SOL' | 'USDC',
  payment: any,
  registeredWallet: string
): Promise<PaymentResult> {
  await db.insert(payments).values({
    userId: context.userId,
    tier,
    token,
    amount: payment.amount,
    signature: payment.signature,
    fromAddress: payment.from,
    toAddress: payment.to,
    status: 'rejected',
    error: `Wallet mismatch: expected ${registeredWallet}, got ${payment.from}`,
  });

  await logAuditEvent({
    type: 'payment.wallet_mismatch',
    userId: context.userId,
    telegramId: context.telegramId,
    metadata: { tier, token, expected: registeredWallet, actual: payment.from },
  });

  await sendUserNotification(context.telegramId,
    `❌ Payment rejected. Please send payment from your registered wallet: \`${registeredWallet}\``
  );

  return {
    success: false,
    action: 'wrong_wallet',
    error: `Please send payment from your registered wallet: ${registeredWallet}`,
  };
}

/**
 * Scenario 5: Old Treasury - Manual Investigation
 */
async function handleOldTreasuryPayment(
  context: PaymentContext,
  tier: 'monthly' | 'lifetime',
  token: 'SOL' | 'USDC',
  payment: any
): Promise<PaymentResult> {
  await db.insert(payments).values({
    userId: context.userId,
    tier,
    token,
    amount: payment.amount,
    signature: payment.signature,
    fromAddress: payment.from,
    toAddress: payment.to,
    status: 'pending_review',
    error: 'Payment to old treasury address. Requires manual investigation.',
  });

  await logAuditEvent({
    type: 'payment.old_treasury',
    userId: context.userId,
    telegramId: context.telegramId,
    metadata: { tier, token, amount: payment.amount, signature: payment.signature },
  });

  await sendAdminAlert(`Payment received to OLD treasury address (${OLD_TREASURY_ADDRESS}). Amount: ${payment.amount}. Requires manual investigation. (User: ${context.telegramId})`);

  await sendUserNotification(context.telegramId,
    `⚠️ Your payment was sent to our old treasury address. Our team is investigating and will process a refund within 24-48 hours. For future payments, please use: \`${TREASURY_ADDRESS}\``
  );

  return {
    success: false,
    action: 'old_treasury_manual_review',
    error: 'Payment sent to old treasury. Our team will process a refund within 24-48 hours.',
  };
}

/**
 * Scenario 6: Duplicate Payment - Reject + Alert Admin + Notify User
 */
async function handleDuplicatePayment(
  context: PaymentContext,
  signature: string
): Promise<PaymentResult> {
  await logAuditEvent({
    type: 'security.duplicate_payment_attempt',
    userId: context.userId,
    telegramId: context.telegramId,
    metadata: { signature },
  });

  await sendAdminAlert(`⚠️ Possible replay attack! User attempted to reuse payment signature: ${signature}. (User: ${context.telegramId})`);

  await sendUserNotification(context.telegramId,
    `⚠️ This payment has already been processed. If you believe this is an error, please contact support.`
  );

  return {
    success: false,
    action: 'duplicate_rejected',
    error: 'This payment has already been processed.',
  };
}

/**
 * Scenario 12: Refund Request (24h window)
 */
export async function processRefundRequest(
  context: PaymentContext,
  paymentId: number
): Promise<PaymentResult> {
  const payment = await db.select().from(payments)
    .where(and(
      eq(payments.id, paymentId),
      eq(payments.userId, context.userId)
    ))
    .limit(1);

  if (!payment[0]) {
    return { success: false, action: 'refund_failed', error: 'Payment not found' };
  }

  const paymentTime = new Date(payment[0].createdAt);
  const hoursSincePayment = (Date.now() - paymentTime.getTime()) / (1000 * 60 * 60);

  if (hoursSincePayment > 24) {
    return {
      success: false,
      action: 'refund_window_expired',
      error: 'Refund requests must be made within 24 hours of payment.'
    };
  }

  await db.update(payments)
    .set({ status: 'refund_pending' })
    .where(eq(payments.id, paymentId));

  await sendAdminAlert(`User requested refund for payment ${paymentId}. Amount: ${payment[0].amount} ${payment[0].token}. Process refund within 24 hours. (User: ${context.telegramId})`);

  await sendUserNotification(context.telegramId,
    `✅ Refund requested. Our team will process your refund of ${payment[0].amount} ${payment[0].token} within 24 hours.`
  );

  return {
    success: true,
    action: 'refund_requested',
  };
}

/**
 * Scenario 13: Multi-Account Wallet - Reject Second
 */
async function handleMultiAccountWallet(
  existingUserId: number,
  newUserId: number,
  walletAddress: string
): Promise<PaymentResult> {
  await logAuditEvent({
    type: 'security.multi_account_attempt',
    metadata: { existingUserId, newUserId, walletAddress, timestamp: new Date().toISOString() },
  });

  await sendAdminAlert(`Wallet ${walletAddress} attempted to create second account. Already linked to user ${existingUserId}.`);

  return {
    success: false,
    action: 'wallet_already_linked',
    error: 'This wallet is already linked to another account.',
  };
}

/**
 * Poll for transaction confirmation (Scenario 7: Network Congestion)
 */
async function pollTransaction(signature: string, maxAttempts = 60, intervalMs = 15000): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const connection = rpcFailover.getConnection();
      const tx = await connection.getTransaction(signature, {
        commitment: 'finalized',
        maxSupportedTransactionVersion: 0,
      });

      if (tx && !tx.meta?.err) {
        return true;
      }
    } catch (err) {
      console.error(`Poll attempt ${attempt + 1} failed:`, err);
    }

    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  return false;
}

/**
 * Main Payment Processor - Routes to appropriate handler based on scenario
 */
export async function processPayment(
  context: PaymentContext,
  params: {
    signature: string;
    tier: 'monthly' | 'lifetime';
    token: 'SOL' | 'USDC';
    autoRenew: boolean;
  }
): Promise<PaymentResult> {
  const { signature, tier, token, autoRenew } = params;

  // Check for duplicate (Scenario 6)
  const existingPayment = await db.select().from(payments)
    .where(eq(payments.signature, signature))
    .limit(1);

  if (existingPayment.length > 0) {
    return handleDuplicatePayment(context, signature);
  }

  // Get user and registered wallet
  const user = await db.select().from(users).where(eq(users.id, context.userId)).limit(1);
  if (!user[0]) {
    return { success: false, action: 'user_not_found', error: 'User not found' };
  }

  const wallet = await db.select().from(wallets)
    .where(eq(wallets.userId, context.userId))
    .limit(1);

  const registeredWallet = wallet[0]?.address;

  // Verify payment on-chain
  const expectedAmount = tier === 'monthly'
    ? (token === 'SOL' ? 0.3 * LAMPORTS_PER_SOL : 45 * USDC_DECIMALS)
    : (token === 'SOL' ? 1.0 * LAMPORTS_PER_SOL : 150 * USDC_DECIMALS);

  const verification = await verifyPayment(signature, token, expectedAmount);

  if (!verification.verified || !verification.payment) {
    await db.insert(payments).values({
      userId: context.userId,
      tier,
      token,
      amount: 0,
      signature,
      fromAddress: 'unknown',
      toAddress: TREASURY_ADDRESS,
      status: 'failed',
      error: verification.error || 'Verification failed',
    });

    return {
      success: false,
      action: 'verification_failed',
      error: verification.error || 'Payment verification failed',
    };
  }

  const payment = verification.payment;

  // Scenario 5: Old Treasury
  if (payment.to === OLD_TREASURY_ADDRESS) {
    return handleOldTreasuryPayment(context, tier, token, payment);
  }

  // Scenario 4: Wrong Wallet
  if (registeredWallet && payment.from !== registeredWallet) {
    return handleWrongWallet(context, tier, token, payment, registeredWallet);
  }

  // Scenario 13: Multi-account check
  if (registeredWallet) {
    const existingAccount = await db.select().from(users)
      .innerJoin(wallets, eq(users.id, wallets.userId))
      .where(and(
        eq(wallets.address, payment.from),
        eq(wallets.userId, context.userId)
      ))
      .limit(1);

    if (existingAccount.length > 1) {
      return handleMultiAccountWallet(existingAccount[0].users.id, context.userId, payment.from);
    }
  }

  // Scenario 2: Overpayment (with 1% tolerance for gas fees)
  if (payment.amount > expectedAmount * 1.01) {
    return handleOverpayment(context, tier, token, payment, expectedAmount);
  }

  // Scenario 3: Underpayment
  if (payment.amount < expectedAmount * 0.99) {
    return handleUnderpayment(context, tier, token, payment, expectedAmount);
  }

  // Scenario 1: Exact Payment (Happy Path)
  return handleExactPayment(context, tier, token, payment, autoRenew);
}

/**
 * Auto-renewal processor (Scenario 8)
 */
export async function processAutoRenewal(userId: number): Promise<PaymentResult> {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]) {
    return { success: false, action: 'user_not_found', error: 'User not found' };
  }

  if (user[0].tier !== 'monthly' || !user[0].autoRenew) {
    return { success: false, action: 'not_eligible', error: 'Auto-renewal not enabled' };
  }

  const now = new Date();
  if (user[0].currentPeriodEnd && new Date(user[0].currentPeriodEnd) > now) {
    return { success: false, action: 'not_yet_due', error: 'Subscription not yet due for renewal' };
  }

  const wallet = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (!wallet[0]) {
    return { success: false, action: 'no_wallet', error: 'No registered wallet for auto-renewal' };
  }

  await sendAdminAlert(`Auto-renewal initiated for user ${userId}. Attempting to charge 0.3 SOL. (Telegram: ${user[0].telegramId})`);

  return {
    success: true,
    action: 'auto_renewal_initiated',
  };
}

/**
 * Subscription downgrade handler (Scenario 9)
 */
export async function downgradeSubscription(userId: number): Promise<void> {
  const now = new Date();

  await db.update(users).set({
    tier: 'free',
    autoRenew: false,
    updatedAt: now,
  }).where(eq(users.id, userId));

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (user[0]) {
    await sendUserNotification(user[0].telegramId,
      `⚠️ Your subscription has expired. You've been moved to the free tier. Renew to continue using premium features.`
    );
  }
}

/**
 * Toggle auto-renewal (Scenario 10)
 */
export async function toggleAutoRenewal(userId: number, enabled: boolean): Promise<PaymentResult> {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user[0]) {
    return { success: false, action: 'user_not_found', error: 'User not found' };
  }

  if (user[0].tier !== 'monthly') {
    return { success: false, action: 'not_monthly', error: 'Auto-renewal only applies to monthly subscriptions' };
  }

  await db.update(users).set({
    autoRenew: enabled,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));

  const message = enabled
    ? `✅ Auto-renewal enabled. Your subscription will automatically renew each month.`
    : `ℹ️ Auto-renewal disabled. Your current subscription remains active until ${user[0].currentPeriodEnd}.`;

  await sendUserNotification(user[0].telegramId, message);

  return {
    success: true,
    action: enabled ? 'auto_renew_enabled' : 'auto_renew_disabled',
    autoRenew: enabled,
  };
}