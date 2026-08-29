/**
 * OSIRIS Notification System
 * Handles user notifications and admin alerts for payment events
 */

export interface Notification {
  type: 'telegram' | 'email' | 'push';
  recipient: string;
  subject?: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface NotificationLog {
  id?: string;
  notification: Notification;
  sent: boolean;
  error?: string;
  createdAt: Date;
}

// Admin configuration
const ADMIN_TELEGRAM_IDS = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').filter(Boolean);
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);

/**
 * Send notification to all admins (critical alerts)
 */
export async function sendAdminAlert(message: string): Promise<void> {
  for (const adminId of ADMIN_TELEGRAM_IDS) {
    try {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: parseInt(adminId),
          text: `🚨 ${message}`,
          parse_mode: 'HTML',
        }),
      });
    } catch (err) {
      console.error(`Failed to send admin alert to ${adminId}:`, err);
    }
  }

  // Email alerts
  for (const email of ADMIN_EMAILS) {
    try {
      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `🚨 OSIRIS Alert`,
          body: message,
        }),
      });
    } catch (err) {
      console.error(`Failed to send admin email to ${email}:`, err);
    }
  }
}

/**
 * Send notification to user via their preferred channel
 */
export async function sendUserNotification(
  telegramId: number,
  message: string,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<NotificationLog> {
  const notification: NotificationLog = {
    notification: {
      type: 'telegram',
      recipient: telegramId.toString(),
      body: message,
      priority,
    },
    sent: false,
    createdAt: new Date(),
  };

  try {
    // Telegram notification
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (response.ok) {
      notification.sent = true;
    } else {
      notification.error = `Telegram API error: ${response.status}`;
    }
  } catch (err) {
    notification.error = err instanceof Error ? err.message : 'Unknown error';
  }

  return notification;
}

/**
 * Payment success notification
 */
export async function notifyPaymentSuccess(
  telegramId: number,
  tier: string,
  amount: number,
  token: string
): Promise<void> {
  await sendUserNotification(
    telegramId,
    `✅ Payment verified! Your ${tier} subscription is now active. Amount: ${amount} ${token}`,
    'high'
  );
}

/**
 * Overpayment notification
 */
export async function notifyOverpayment(
  telegramId: number,
  excessAmount: number,
  token: string
): Promise<void> {
  await sendUserNotification(
    telegramId,
    `⚠️ Overpayment detected. Excess: ${excessAmount} ${token}. Our team will process a refund within 24 hours.`,
    'medium'
  );
}

/**
 * Underpayment notification
 */
export async function notifyUnderpayment(
  telegramId: number,
  shortfall: number,
  token: string
): Promise<void> {
  await sendUserNotification(
    telegramId,
    `❌ Insufficient payment. Shortfall: ${shortfall} ${token}. Please send the correct amount.`,
    'high'
  );
}

/**
 * Wrong wallet notification
 */
export async function notifyWrongWallet(
  telegramId: number,
  registeredWallet: string
): Promise<void> {
  await sendUserNotification(
    telegramId,
    `❌ Payment rejected. Please send payment from your registered wallet: ${registeredWallet}`,
    'high'
  );
}

/**
 * Old treasury notification
 */
export async function notifyOldTreasury(
  telegramId: number
): Promise<void> {
  await sendUserNotification(
    telegramId,
    `⚠️ Your payment was sent to our old treasury address. Our team will process a refund within 24-48 hours. Please use: ${process.env.PHANTOM_SOL_ADDRESS || '3FfRM3fzy...'}`,
    'medium'
  );
}

/**
 * Duplicate payment notification
 */
export async function notifyDuplicatePayment(
  telegramId: number
): Promise<void> {
  await sendUserNotification(
    telegramId,
    `⚠️ This payment has already been processed. If you believe this is an error, please contact support.`,
    'medium'
  );
}

/**
 * Auto-renewal notification
 */
export async function notifyAutoRenewal(
  telegramId: number,
  amount: number,
  token: string,
  success: boolean
): Promise<void> {
  if (success) {
    await sendUserNotification(
      telegramId,
      `✅ Auto-renewal successful! ${amount} ${token} charged. Subscription extended.`,
      'high'
    );
  } else {
    await sendUserNotification(
      telegramId,
      `❌ Auto-renewal failed. Insufficient balance to charge ${amount} ${token}. Please top up your wallet to maintain subscription.`,
      'high'
    );
  }
}

/**
 * Subscription expiry notification
 */
export async function notifySubscriptionExpiry(
  telegramId: number,
  tier: string,
  daysBefore: number = 3
): Promise<void> {
  await sendUserNotification(
    telegramId,
    `⚠️ Your ${tier} subscription expires in ${daysBefore} day(s). Renew now to maintain access.`,
    'high'
  );
}

/**
 * Immediate downgrade notification
 */
export async function notifyDowngrade(
  telegramId: number,
  tier: string
): Promise<void> {
  await sendUserNotification(
    telegramId,
    `⚠️ Your ${tier} subscription has expired. You've been moved to the free tier. Renew to continue using premium features.`,
    'high'
  );
}

/**
 * Admin alert for fraud/duplicate detection
 */
export async function notifyAdminFraudAttempt(
  telegramId: number,
  reason: string
): Promise<void> {
  await sendAdminAlert(
    `⚠️ Possible fraud attempt from user ${telegramId}. Reason: ${reason}`
  );
}

/**
 * Refund notification
 */
export async function notifyRefund(
  telegramId: number,
  amount: number,
  token: string
): Promise<void> {
  await sendUserNotification(
    telegramId,
    `✅ Refund processed! ${amount} ${token} will be returned to your wallet within 24 hours.`,
    'high'
  );
}