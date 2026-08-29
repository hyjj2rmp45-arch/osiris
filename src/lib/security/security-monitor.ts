/**
 * Security Monitoring Service — OSIRIS Phase 5+
 *
 * Centralized security monitoring that wires together all security alert helpers
 * and adds periodic checks for breach scenarios:
 * - Hackers / unauthorized access
 * - Break-ins / forced session transitions
 * - Data exfiltration
 * - Certificate pinning failures
 */

import { AdminAlerts } from '@/lib/admin-alerts';
import { verifyDomain, reportCertificatePinningFailure, REAL_DOMAIN } from '@/lib/security/anti-phishing';
import { ClipboardMonitor } from '@/lib/security/anti-keylogger';
import { publish } from '@/lib/events/bus';

export interface SecurityCheckResult {
  passed: boolean;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export class SecurityMonitor {
  private clipboardMonitor: ClipboardMonitor;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private failedAttempts = new Map<string, number>();

  constructor() {
    this.clipboardMonitor = new ClipboardMonitor();
  }

  /**
   * Start periodic security monitoring
   */
  start(intervalMs = 60_000): void {
    if (this.monitoringInterval) return;
    
    this.monitoringInterval = setInterval(() => {
      this.runChecks();
    }, intervalMs);

    // Run initial checks
    this.runChecks();
  }

  /**
   * Stop security monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Run all security checks
   */
  private async runChecks(): Promise<void> {
    try {
      await this.checkDomainIntegrity();
      await this.checkCertificatePinning();
      await this.checkUnauthorizedAccessPatterns();
      await this.checkDataExfiltrationSignals();
    } catch (error) {
      console.error('[SecurityMonitor] Check failed:', error);
    }
  }

  /**
   * Check if current domain matches real domain
   */
  private async checkDomainIntegrity(): Promise<void> {
    if (typeof window === 'undefined') return;

    const hostname = window.location.hostname;
    if (hostname !== REAL_DOMAIN) {
      AdminAlerts.security.phishingDetected(hostname, navigator.userAgent);
    }
  }

  /**
   * Check certificate pinning
   */
  private async checkCertificatePinning(): Promise<void> {
    // In production: verify actual TLS certificate against pinned hashes
    // For now, this is a placeholder that would be triggered by actual TLS failures
    const expected = 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    const actual = 'actual-cert-hash';
    
    if (String(expected) !== String(actual)) {
      reportCertificatePinningFailure(expected, actual);
    }
  }

  /**
   * Check for unauthorized access patterns
   */
  private async checkUnauthorizedAccessPatterns(): Promise<void> {
    // Monitor for:
    // 1. Multiple failed auth attempts from same IP
    // 2. Access to restricted endpoints without proper auth
    // 3. Session hijacking indicators
    
    // This would integrate with auth middleware and session state machine
    // For now, publish an event that security services can listen to
    publish('security:monitor_check', {
      type: 'unauthorized_access_patterns',
      timestamp: Date.now(),
    });
  }

  /**
   * Check for data exfiltration signals
   */
  private async checkDataExfiltrationSignals(): Promise<void> {
    // Monitor for:
    // 1. Bulk API responses to single user
    // 2. Unusual export/download patterns
    // 3. Large data transfers to external IPs
    // 4. Multiple wallet enumeration attempts
    
    publish('security:monitor_check', {
      type: 'data_exfiltration_signals',
      timestamp: Date.now(),
    });
  }

  /**
   * Record failed authentication attempt
   */
  recordFailedAttempt(identifier: string, ip: string, reason: string): void {
    const key = `${identifier}:${ip}`;
    const attempts = (this.failedAttempts.get(key) || 0) + 1;
    this.failedAttempts.set(key, attempts);

    if (attempts >= 5) {
      AdminAlerts.security.unauthorizedAccess('auth', ip, identifier);
      this.failedAttempts.delete(key);
    }
  }

  /**
   * Check clipboard for suspicious content
   */
  checkClipboard(content: string): void {
    this.clipboardMonitor.checkAndAlert(content);
  }

  /**
   * Report potential data exfiltration
   */
  reportDataExfiltration(dataType: string, userId: string, ip: string): void {
    AdminAlerts.security.dataExfiltrationAttempt(dataType, userId, ip);
  }

  /**
   * Report privilege escalation attempt
   */
  reportPrivilegeEscalation(userId: string, fromRole: string, toRole: string): void {
    AdminAlerts.security.privilegeEscalation(userId, fromRole, toRole);
  }
}

export const securityMonitor = new SecurityMonitor();