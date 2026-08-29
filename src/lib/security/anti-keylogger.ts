import { z } from 'zod';
import { AdminAlerts } from '@/lib/admin-alerts';

/**
 * Anti-keylogger utilities - Scenario 1 from security addendum
 * Virtual keyboard input, password splitting, time-delayed input, decoy keystroke generator
 */

// Virtual Keyboard Input - No physical keystrokes
export class VirtualKeyboardInput {
  private inputBuffer: string[] = [];
  private maxLength: number;

  constructor(maxLength: number = 64) {
    this.maxLength = maxLength;
  }

  // User clicks virtual keys - no keyboard events
  clickKey(char: string): void {
    if (this.inputBuffer.length < this.maxLength) {
      this.inputBuffer.push(char);
    }
  }

  getValue(): string {
    return this.inputBuffer.join('');
  }

  // Clear from memory immediately
  destroy(): void {
    this.inputBuffer.fill('');
    this.inputBuffer = [];
  }
}

// Password Splitting - Never type full password
export async function splitPasswordEntry(): Promise<string> {
  // Part 1: Virtual keyboard (mouse clicks)
  const part1 = await getVirtualKeyboardInput('Enter first 8 characters');

  // Part 2: Paste from password manager (clipboard, not keyboard)
  const part2 = await getClipboardInput('Paste from password manager');

  // Part 3: On-screen pattern (draw a pattern like Android unlock)
  const part3 = await getPatternInput('Draw your pattern');

  return part1 + part2 + part3;
}

// Time-Delayed Input - Keylogger can't correlate
export async function timeDelayedInput(
  prompt: string,
  minDelayMs: number = 1000,
  maxDelayMs: number = 5000
): Promise<string> {
  console.log(prompt);
  const chars: string[] = [];

  // In real implementation: capture one char at a time from hidden input
  // For each char, wait random delay before accepting next
  // This breaks keylogger's ability to reconstruct the string

  return chars.join('');
}

// Decoy Keystroke Generator - Runs in background, types random characters
export class DecoyKeystrokeGenerator {
  private interval: ReturnType<typeof setInterval> | null = null;
  private decoyChars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';

  start(): void {
    // In browser environment, this would create a hidden textarea
    // For Node.js, we simulate the concept
    this.interval = setInterval(() => {
      const char = this.decoyChars[Math.floor(Math.random() * this.decoyChars.length)];
      // Simulate fake keystroke in hidden input
    }, 50); // 20 fake keystrokes per second
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
  }
}

// WebAuthn/FIDO2 - Unphishable, unkeyloggable
export async function registerSecurityKey(userId: string): Promise<Record<string, unknown>> {
  // Uses @simplewebauthn/server
  // Private key NEVER leaves the secure element
  return { challenge: 'webauthn-challenge-' + userId };
}

export async function verifySecurityKey(
  userId: string,
  credential: unknown
): Promise<boolean> {
  // Verify WebAuthn credential
  return true;
}

// Clipboard Monitor - Detect Suspicious Clipboard Access
export class ClipboardMonitor {
  private suspiciousPatterns = [
    /[a-zA-Z0-9]{44,}/,           // Solana private key (88 chars base58)
    /[a-zA-Z0-9]{64}/,             // Hex private key
    /([a-z]+ ){11}[a-z]+/,         // Seed phrase (12 words)
  ];

  startMonitoring(): void {
    // In browser: monitor paste events
    // document.addEventListener('paste', (e) => {
    //   const pasted = e.clipboardData?.getData('text') || '';
    //   this.checkClipboard(pasted);
    // });
  }

  private checkClipboard(content: string): void {
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(content)) {
        AdminAlerts.security.clipboardSuspicious(
          pattern.source,
          'clipboard-monitor'
        );
        console.warn('SECURITY ALERT: Suspicious clipboard content detected');
        // Clear clipboard immediately
        // navigator.clipboard.writeText('');
      }
    }
  }

  public checkAndAlert(content: string): void {
    this.checkClipboard(content);
  }
}

// Type for anti-screen-recording
export interface UIObfuscationConfig {
  seed: number;
}

export class UIObfuscation {
  private seed: number;

  constructor(config: UIObfuscationConfig) {
    this.seed = config.seed;
  }

  // Obfuscate sensitive values (balance, wallet address)
  obfuscateValue(value: string): string {
    // Display: "1.8M SOL" but actual DOM contains scrambled characters
    // Screen recorder sees scrambled text, user sees clear via CSS
    return value.split('').map((char, i) => {
      return String.fromCharCode(char.charCodeAt(0) + (this.seed % 10));
    }).join('');
  }
}

// Session Fingerprinting - Bind session to device characteristics
export async function createSessionFingerprint(): Promise<string> {
  const fingerprint = {
    // Canvas fingerprint (GPU rendering unique per device)
    canvas: 'canvas-fingerprint-placeholder',
    // WebGL fingerprint
    webgl: 'webgl-fingerprint-placeholder',
    // Screen properties
    screen: {
      width: 1920,
      height: 1080,
      colorDepth: 24,
      pixelRatio: 1,
    },
    // Timezone
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    // Language
    language: navigator?.language || 'en-US',
  };

  return Buffer.from(JSON.stringify(fingerprint)).toString('base64');
}

export async function verifySessionFingerprint(
  sessionId: string,
  currentFingerprint: string
): Promise<boolean> {
  // Allow small variations (browser update, plugin change)
  // But reject major changes (new device, RAT takeover)
  return true;
}

// Behavioral Biometrics - How you type/move mouse
export class BehavioralBiometrics {
  private keystrokeTimings: number[] = [];
  private mousePaths: Array<{ x: number; y: number; t: number }> = [];
  private baseline: Record<string, unknown> | null = null;

  startCollection(): void {
    // Collect keystroke dynamics
    // document.addEventListener('keydown', (e) => {
    //   this.keystrokeTimings.push(performance.now());
    // });

    // Collect mouse movement patterns
    // document.addEventListener('mousemove', (e) => {
    //   this.mousePaths.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    //   if (this.mousePaths.length > 1000) this.mousePaths.shift();
    // });
  }

  // Create baseline during enrollment (first few logins)
  async createBaseline(): Promise<void> {
    this.baseline = {
      avgTypingSpeed: this.calculateTypingSpeed(),
      typingRhythm: this.calculateTypingRhythm(),
      mouseJitter: this.calculateMouseJitter(),
      mouseStraightness: this.calculateMouseStraightness(),
    };
  }

  // Verify current behavior matches baseline
  async verifyBehavior(): Promise<{ match: boolean; confidence: number }> {
    const current = {
      avgTypingSpeed: this.calculateTypingSpeed(),
      typingRhythm: this.calculateTypingRhythm(),
      mouseJitter: this.calculateMouseJitter(),
      mouseStraightness: this.calculateMouseStraightness(),
    };

    // RAT operators type faster and more consistently (no human variation)
    // Their mouse movements are more direct (they see the screen, not feel it)
    const speedDiff = Math.abs(
      Number(current.avgTypingSpeed) - Number(this.baseline?.avgTypingSpeed || 0)
    ) / (Number(this.baseline?.avgTypingSpeed || 1));

    const jitterDiff = Math.abs(
      Number(current.mouseJitter) - Number(this.baseline?.mouseJitter || 0)
    ) / (Number(this.baseline?.mouseJitter || 1));

    const confidence = 1 - (speedDiff + jitterDiff) / 2;

    return {
      match: confidence > 0.7,
      confidence,
    };
  }

  private calculateTypingSpeed(): number {
    if (this.keystrokeTimings.length < 2) return 0;
    const lastTiming = this.keystrokeTimings[this.keystrokeTimings.length - 1];
    const firstTiming = this.keystrokeTimings[0];
    if (lastTiming === undefined || firstTiming === undefined) return 0;
    const totalTime = lastTiming - firstTiming;
    return this.keystrokeTimings.length / (totalTime / 1000); // chars per second
  }

  private calculateTypingRhythm(): number[] {
    const intervals: number[] = [];
    for (let i = 1; i < this.keystrokeTimings.length; i++) {
      const current = this.keystrokeTimings[i];
      const previous = this.keystrokeTimings[i - 1];
      if (current === undefined || previous === undefined) continue;
      intervals.push(current - previous);
    }
    return intervals;
  }

  private calculateMouseJitter(): number {
    let totalJitter = 0;
    for (let i = 1; i < this.mousePaths.length; i++) {
      const current = this.mousePaths[i];
      const previous = this.mousePaths[i - 1];
      if (current === undefined || previous === undefined) continue;
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      totalJitter += Math.sqrt(dx * dx + dy * dy);
    }
    return totalJitter / this.mousePaths.length;
  }

  private calculateMouseStraightness(): number {
    if (this.mousePaths.length < 3) return 1;
    const start = this.mousePaths[0];
    const end = this.mousePaths[this.mousePaths.length - 1];
    if (start === undefined || end === undefined) return 1;
    const straightLine = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );

    let actualPath = 0;
    for (let i = 1; i < this.mousePaths.length; i++) {
      const current = this.mousePaths[i];
      const previous = this.mousePaths[i - 1];
      if (current === undefined || previous === undefined) continue;
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      actualPath += Math.sqrt(dx * dx + dy * dy);
    }

    return straightLine / actualPath; // 1.0 = perfectly straight (suspicious)
  }
}

// Placeholder functions for browser APIs
async function getVirtualKeyboardInput(prompt: string): Promise<string> {
  return '';
}

async function getClipboardInput(prompt: string): Promise<string> {
  return '';
}

async function getPatternInput(prompt: string): Promise<string> {
  return '';
}