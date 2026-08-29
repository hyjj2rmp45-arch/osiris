/**
 * Admin Alerts — OSIRIS Phase 7.3+
 * Multi-channel alerting for critical system events:
 *   1. Telegram (instant, via grammy bot)
 *   2. In-app SSE (instant, via event bus)
 *   3. Email-to-SMS (free, AT&T @txt.att.net, 10-60s latency)
 *   4. ntfy.sh (push notifications, public or authenticated)
 *
 * All security notifications use priority: true to bypass batching/rate-limits.
 */

import { publish } from '@/lib/events/bus';
import { notificationBatcher } from '@/lib/notification-batcher';
import { telegramBot } from '@/bot/telegram';
import { sendSms } from '@/lib/smsProvider';
import { db } from '@/lib/db';
import { notificationEvents } from '@/lib/schema';

// ============================================================================
// Types
// ============================================================================

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AdminAlertPayload {
  /** Unique request ID for tracing */
  requestId: string;
  /** Human-readable alert title */
  title: string;
  /** Detailed message */
  message: string;
  /** Severity level */
  severity: AlertSeverity;
  /** Source component (e.g., 'auth', 'circuit-breaker', 'tokenomics') */
  source: string;
  /** Optional metadata */
  metadata?: Record<string, unknown> | undefined;
  /** Timestamp (ISO string) */
  timestamp: string;
}

export interface AdminAlertChannels {
  telegram: boolean;
  sse: boolean;
  sms: boolean;
  ntfy: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

interface AdminAlertConfig {
  /** Admin Telegram user IDs (from /start command) */
  adminUserIds: number[];
  /** AT&T email-to-SMS gateway: 5551234567@txt.att.net */
  smsEmail?: string;
  /** SMTP config for email-to-SMS */
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string; pass: string };
    from: string;
  };
  /** ntfy topic or target URL, e.g. OSIRIS or https://ntfy.sh/OSIRIS */
  ntfyTopic?: string;
  /** Which channels to enable */
  channels: AdminAlertChannels;
}

let config: AdminAlertConfig = {
  adminUserIds: [],
  channels: { telegram: true, sse: true, sms: false, ntfy: false },
};

let configInitialized = false;

/** Initialize config from environment variables (lazy) */
function initConfigFromEnv(): void {
  if (configInitialized) return;
  configInitialized = true;

  const smsEmail = process.env.ADMIN_SMS_EMAIL;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpSecure = process.env.SMTP_SECURE === 'true';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM;
  const ntfyTopic = process.env.NTFY_TOPIC || 'OSIRIS';

  if (smsEmail && smtpHost && smtpPort && smtpUser && smtpPass && smtpFrom) {
    config.smsEmail = smsEmail;
    config.smtp = {
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
      from: smtpFrom,
    };
    config.channels.sms = true;
    console.log('[AdminAlerts] SMS channel enabled via email-to-SMS');
  } else {
    console.log('[AdminAlerts] SMS channel disabled (missing env vars)');
  }

  if (ntfyTopic) {
    config.ntfyTopic = ntfyTopic;
    config.channels.ntfy = true;
    console.log(`[AdminAlerts] ntfy channel enabled for topic: ${ntfyTopic}`);
  } else {
    console.log('[AdminAlerts] ntfy channel disabled');
  }
}

/** Ensure config is initialized */
function ensureConfig(): void {
  if (!configInitialized) {
    initConfigFromEnv();
  }
}

export function configureAdminAlerts(cfg: Partial<AdminAlertConfig>): void {
  ensureConfig();
  config = { ...config, ...cfg };
  if (cfg.smtp && cfg.smsEmail) {
    config.channels.sms = true;
  }
  if (cfg.ntfyTopic) {
    config.channels.ntfy = true;
  }
}

export function getAdminAlertConfig(): AdminAlertConfig {
  ensureConfig();
  return { ...config };
}

// ============================================================================
// Telegram Alert
// ============================================================================

async function sendTelegramAlert(payload: AdminAlertPayload): Promise<void> {
  if (!config.channels.telegram || config.adminUserIds.length === 0) return;

  const emoji = {
    critical: '🚨',
    high: '⚠️',
    medium: '⚡',
    low: 'ℹ️',
  }[payload.severity];

  const text = `${emoji} <b>${payload.title}</b>\n\n${payload.message}\n\n` +
    `<b>Source:</b> ${payload.source}\n` +
    `<b>Request ID:</b> <code>${payload.requestId}</code>\n` +
    `<b>Time:</b> ${payload.timestamp}\n` +
    `<b>Severity:</b> ${payload.severity}`;

  for (const userId of config.adminUserIds) {
    try {
      await telegramBot.api.sendMessage(userId, text, { parse_mode: 'HTML' });
      await recordNotificationEvent(payload, 'telegram', 'sent');
    } catch (err) {
      console.error(`[AdminAlerts] Telegram send failed for ${userId}:`, err);
      await recordNotificationEvent(payload, 'telegram', 'failed', err instanceof Error ? err.message : String(err));
    }
  }
}

// ============================================================================
// SSE (In-App) Alert
// ============================================================================

function sendSseAlert(payload: AdminAlertPayload): void {
  if (!config.channels.sse) return;
  publish('admin:alert', payload);
  recordNotificationEvent(payload, 'sse', 'sent').catch(() => {});
}

// ============================================================================
// ntfy.sh Alert
// ============================================================================

async function sendNtfyAlert(payload: AdminAlertPayload): Promise<void> {
  if (!config.channels.ntfy || !config.ntfyTopic) return;

  const topic = config.ntfyTopic;
  const url = topic.startsWith('http') ? topic : `https://ntfy.sh/${encodeURIComponent(topic)}`;

  const emoji = {
    critical: '🚨',
    high: '⚠️',
    medium: '⚡',
    low: 'ℹ️',
  }[payload.severity];

  const body = `${emoji} ${payload.title}\n\n${payload.message}\n\nSource: ${payload.source}\nRequest ID: ${payload.requestId}\nTime: ${payload.timestamp}\nSeverity: ${payload.severity}`;

  try {
    console.log(`[AdminAlerts][ntfy] POST ${url} | topic=${topic} | title=${payload.title}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Title: payload.title,
        Priority: payload.severity === 'critical' ? '5' : payload.severity === 'high' ? '4' : payload.severity === 'medium' ? '3' : '2',
        Tags: payload.source,
      },
      body,
    });

    const responseText = await response.text();
    const status = response.ok ? 'sent' : 'failed';
    console.log(`[AdminAlerts][ntfy] response ${response.status} ${response.statusText} | body=${responseText}`);

    if (!response.ok) {
      console.error(`[AdminAlerts] ntfy send failed: ${response.status} ${response.statusText} - ${responseText}`);
    }

    await recordNotificationEvent(payload, 'ntfy', status, response.ok ? undefined : responseText);
  } catch (err) {
    console.error('[AdminAlerts] ntfy send error:', err);
    await recordNotificationEvent(payload, 'ntfy', 'failed', err instanceof Error ? err.message : String(err));
  }
}

// ============================================================================
// Main Alert Function
// ============================================================================

/**
 * Send an admin alert across all configured channels.
 * Uses priority: true to bypass batching and rate limits.
 */
export async function sendAdminAlert(payload: AdminAlertPayload): Promise<void> {
  const fullPayload: AdminAlertPayload = {
    ...payload,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };

  // Fire all channels in parallel (non-blocking)
  const promises: Promise<void>[] = [];

  if (config.channels.telegram) {
    promises.push(sendTelegramAlert(fullPayload));
  }

  if (config.channels.sse) {
    sendSseAlert(fullPayload); // synchronous, instant
  }

  if (config.channels.sms) {
    // Build a concise SMS text (≤160 chars is safe for carriers)
    const smsText = `${payload.severity} Alert: ${payload.message}
Source: ${payload.source}
${payload.requestId ? `ReqID: ${payload.requestId}` : ''}
${payload.timestamp}`;

    // Textbelt expects the phone number in E.164 format, e.g. +141****7407
    const phoneNumber = '+141****7407'; // your AT&T number

    promises.push(sendSms(phoneNumber, smsText).then(() => {
      recordNotificationEvent(payload, 'sms', 'sent').catch(() => {});
    }).catch((sendError) => {
      recordNotificationEvent(payload, 'sms', 'failed', sendError instanceof Error ? sendError.message : String(sendError)).catch(() => {});
    }));
  }

  if (config.channels.ntfy) {
    promises.push(sendNtfyAlert(fullPayload));
  }

  await Promise.allSettled(promises);
}

// ============================================================================
// Persistence for Reporting
// ============================================================================

export async function recordNotificationEvent(payload: AdminAlertPayload, channel: string, status: 'pending' | 'sent' | 'failed', error?: string): Promise<void> {
  try {
    await db.insert(notificationEvents).values({
      title: payload.title,
      message: payload.message,
      severity: payload.severity,
      source: payload.source,
      channel,
      status,
      error: error || null,
      requestId: payload.requestId || null,
      metadata: payload.metadata || null,
    });
  } catch (err) {
    console.error('[AdminAlerts] Failed to record notification event:', err);
  }
}

// ============================================================================
// Convenience Helpers for Common Alert Types
// ============================================================================

export const AdminAlerts = {
  /** Critical system failure — immediate attention required */
  critical: (title: string, message: string, source: string, metadata?: Record<string, unknown>) =>
    sendAdminAlert({
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      message,
      severity: 'critical',
      source,
      metadata,
      timestamp: new Date().toISOString(),
    }),

  /** High severity — investigate soon */
  high: (title: string, message: string, source: string, metadata?: Record<string, unknown>) =>
    sendAdminAlert({
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      message,
      severity: 'high',
      source,
      metadata,
      timestamp: new Date().toISOString(),
    }),

  /** Medium severity — monitor */
  medium: (title: string, message: string, source: string, metadata?: Record<string, unknown>) =>
    sendAdminAlert({
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      message,
      severity: 'medium',
      source,
      metadata,
      timestamp: new Date().toISOString(),
    }),

  /** Low severity — informational */
  low: (title: string, message: string, source: string, metadata?: Record<string, unknown>) =>
    sendAdminAlert({
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      message,
      severity: 'low',
      source,
      metadata,
      timestamp: new Date().toISOString(),
    }),

  // Specific alert types per Phase 7.3 design
  auth: {
    loginFailed: (ip: string, userId: string, attempts: number) =>
      AdminAlerts.high(
        'Failed Login Attempts',
        `IP ${ip} failed login for user ${userId} (${attempts} attempts)`,
        'auth',
        { ip, userId, attempts }
      ),
    bruteForce: (ip: string, count: number) =>
      AdminAlerts.critical(
        'Brute Force Detected',
        `IP ${ip} exceeded login threshold (${count} attempts)`,
        'auth',
        { ip, count }
      ),
    mfaBypass: (userId: string, ip: string) =>
      AdminAlerts.critical(
        'MFA Bypass Attempt',
        `User ${userId} from IP ${ip} attempted MFA bypass`,
        'auth',
        { userId, ip }
      ),
    sessionHijack: (sessionId: string, ip: string, fingerprint: string) =>
      AdminAlerts.critical(
        'Session Hijack Detected',
        `Session ${sessionId} accessed from new IP ${ip} (fingerprint: ${fingerprint})`,
        'auth',
        { sessionId, ip, fingerprint }
      ),
  },

  circuitBreaker: {
    opened: (service: string, failureRate: number) =>
      AdminAlerts.high(
        'Circuit Breaker Opened',
        `Service ${service} circuit opened (failure rate: ${failureRate}%)`,
        'circuit-breaker',
        { service, failureRate }
      ),
    halfOpen: (service: string) =>
      AdminAlerts.medium(
        'Circuit Breaker Half-Open',
        `Service ${service} entering half-open state`,
        'circuit-breaker',
        { service }
      ),
    closed: (service: string) =>
      AdminAlerts.low(
        'Circuit Breaker Closed',
        `Service ${service} circuit closed — recovered`,
        'circuit-breaker',
        { service }
      ),
  },

  tokenomics: {
    anomaly: (metric: string, value: number, threshold: number) =>
      AdminAlerts.high(
        'Tokenomics Anomaly',
        `${metric} = ${value} (threshold: ${threshold})`,
        'tokenomics',
        { metric, value, threshold }
      ),
    rugPullRisk: (token: string, score: number) =>
      AdminAlerts.critical(
        'Rug Pull Risk Detected',
        `Token ${token} risk score: ${score}`,
        'tokenomics',
        { token, score }
      ),
    liquidityDrop: (token: string, dropPercent: number) =>
      AdminAlerts.high(
        'Liquidity Drop',
        `Token ${token} liquidity dropped ${dropPercent}%`,
        'tokenomics',
        { token, dropPercent }
      ),
  },

  sessionMachine: {
    revoked: (sessionId: string, reason: string) =>
      AdminAlerts.high(
        'Session Revoked',
        `Session ${sessionId} revoked: ${reason}`,
        'session-machine',
        { sessionId, reason }
      ),
    expired: (sessionId: string) =>
      AdminAlerts.medium(
        'Session Expired',
        `Session ${sessionId} expired`,
        'session-machine',
        { sessionId }
      ),
    concurrentLimit: (userId: string, count: number) =>
      AdminAlerts.medium(
        'Concurrent Session Limit',
        `User ${userId} has ${count} concurrent sessions`,
        'session-machine',
        { userId, count }
      ),
  },

  system: {
    startup: () =>
      AdminAlerts.low('System Started', 'OSIRIS started successfully', 'system'),
    shutdown: () =>
      AdminAlerts.medium('System Shutdown', 'OSIRIS shutting down', 'system'),
    configError: (component: string, error: string) =>
      AdminAlerts.critical(
        'Configuration Error',
        `${component}: ${error}`,
        'system',
        { component, error }
      ),
    rateLimitExceeded: (endpoint: string, ip: string) =>
      AdminAlerts.high(
        'Rate Limit Exceeded',
        `Endpoint ${endpoint} rate limited for IP ${ip}`,
        'system',
        { endpoint, ip }
      ),
    webhookFailure: (source: string, error: string) =>
      AdminAlerts.high(
        'Webhook Failure',
        `${source} webhook failed: ${error}`,
        'system',
        { source, error }
      ),
    killswitchEngaged: (trigger: string, source: string) =>
      AdminAlerts.critical(
        'Killswitch Engaged',
        `Killswitch triggered: ${trigger} by ${source}`,
        'system',
        { trigger, source }
      ),
    multisigExecuted: (proposalType: string, title: string) =>
      AdminAlerts.medium(
        'Multisig Proposal Executed',
        `Executed ${proposalType}: ${title}`,
        'system',
        { proposalType, title }
      ),
  },

  security: {
    phishingDetected: (fakeDomain: string, userAgent: string) =>
      AdminAlerts.critical(
        'Phishing Attack Detected',
        `User is on fake domain: ${fakeDomain}`,
        'security',
        { fakeDomain, userAgent }
      ),
    clipboardSuspicious: (contentType: string, source: string) =>
      AdminAlerts.high(
        'Suspicious Clipboard Content',
        `Possible ${contentType} copied in ${source}`,
        'security',
        { contentType, source }
      ),
    simSwapDetected: (userId: string, phoneNumber: string) =>
      AdminAlerts.high(
        'SIM Swap Detected',
        `User ${userId} phone number recently changed to ${phoneNumber}`,
        'security',
        { userId, phoneNumber }
      ),
    socialEngineeringDetected: (message: string, reasons: string[]) =>
      AdminAlerts.high(
        'Social Engineering Attempt',
        `Message: ${message}`,
        'security',
        { reasons, messageLength: message.length }
      ),
    certificatePinningFailure: (expected: string, actual: string) =>
      AdminAlerts.critical(
        'Certificate Pinning Failure',
        `TLS certificate does not match pinned certificate`,
        'security',
        { expected, actual }
      ),
    unauthorizedAccess: (resource: string, ip: string, userId?: string) =>
      AdminAlerts.high(
        'Unauthorized Access Attempt',
        `Access denied to ${resource} from IP ${ip}${userId ? ` by user ${userId}` : ''}`,
        'security',
        { resource, ip, userId }
      ),
    privilegeEscalation: (userId: string, fromRole: string, toRole: string) =>
      AdminAlerts.critical(
        'Privilege Escalation Attempt',
        `User ${userId} attempted escalation from ${fromRole} to ${toRole}`,
        'security',
        { userId, fromRole, toRole }
      ),
    dataExfiltrationAttempt: (dataType: string, userId: string, ip: string) =>
      AdminAlerts.critical(
        'Data Exfiltration Attempt',
        `Suspicious bulk access to ${dataType} by user ${userId} from IP ${ip}`,
        'security',
        { dataType, userId, ip }
      ),
  },
};

export default AdminAlerts;
