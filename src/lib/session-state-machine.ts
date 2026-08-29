/**
 * Session State Machine — OSIRIS Phase 4
 * Implements the exact transitions, revocation mechanism, and panic button flow
 * required by the master plan for copy trading automation.
 *
 * States: IDLE → ACTIVE → SUSPENDED → REVOKED
 * Transitions are validated by Zod schemas in validation.ts
 */

import { publish } from '@/lib/events/bus';

export enum SessionState {
  IDLE = 'idle',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
}

export enum SessionTrigger {
  START = 'start',
  PAUSE = 'pause',
  RESUME = 'resume',
  REVOKE = 'revoke',
  PANIC = 'panic',
  TIMEOUT = 'timeout',
  ERROR = 'error',
}

export interface SessionContext {
  sessionId: string;
  userId: string;
  walletAddress: string;
  copyPercentage: number;
  maxPositionSize: number;
  minTradeSize: number;
  startedAt: number;
  lastActivity: number;
  errorCount: number;
  maxErrors: number;
}

export interface SessionTransition {
  from: SessionState;
  to: SessionState;
  trigger: SessionTrigger;
  timestamp: number;
  reason?: string;
}

const MAX_ERROR_COUNT = 3;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export class SessionStateMachine {
  private state: SessionState = SessionState.IDLE;
  private transitions: SessionTransition[] = [];
  private context: SessionContext | null = null;

  /**
   * Valid transition matrix — enforced before every state change
   */
  private readonly validTransitions: Record<SessionState, SessionState[]> = {
    [SessionState.IDLE]: [SessionState.ACTIVE],
    [SessionState.ACTIVE]: [SessionState.SUSPENDED, SessionState.REVOKED],
    [SessionState.SUSPENDED]: [SessionState.ACTIVE, SessionState.REVOKED],
    [SessionState.REVOKED]: [], // Terminal state
  };

  /**
   * Start a new session from IDLE → ACTIVE
   */
  start(context: SessionContext): SessionTransition {
    if (this.state !== SessionState.IDLE) {
      publish('security:unauthorized_access', {
        resource: 'session_start',
        userId: context.userId,
        ip: 'unknown',
        fromState: this.state,
        toState: SessionState.ACTIVE,
      });
      throw new Error(`Cannot start from ${this.state}; must be IDLE`);
    }
    this.context = { ...context, startedAt: Date.now(), lastActivity: Date.now(), errorCount: 0 };
    return this.transition(SessionState.ACTIVE, SessionTrigger.START, 'Session initialized');
  }

  /**
   * Pause active session → SUSPENDED
   */
  pause(reason?: string): SessionTransition {
    if (this.state !== SessionState.ACTIVE) {
      publish('security:unauthorized_access', {
        resource: 'session_pause',
        userId: this.context?.userId,
        ip: 'unknown',
        fromState: this.state,
        toState: SessionState.SUSPENDED,
      });
      throw new Error(`Cannot pause from ${this.state}; must be ACTIVE`);
    }
    return this.transition(SessionState.SUSPENDED, SessionTrigger.PAUSE, reason);
  }

  /**
   * Resume suspended session → ACTIVE
   */
  resume(): SessionTransition {
    if (this.state !== SessionState.SUSPENDED) {
      publish('security:unauthorized_access', {
        resource: 'session_resume',
        userId: this.context?.userId,
        ip: 'unknown',
        fromState: this.state,
        toState: SessionState.ACTIVE,
      });
      throw new Error(`Cannot resume from ${this.state}; must be SUSPENDED`);
    }
    if (this.context) this.context.lastActivity = Date.now();
    return this.transition(SessionState.ACTIVE, SessionTrigger.RESUME, 'Session resumed');
  }

  /**
   * Revoke session — immediate terminal transition
   * Can be called from ACTIVE or SUSPENDED
   */
  revoke(reason: string = 'Manual revocation'): SessionTransition {
    if (this.state === SessionState.REVOKED) {
      publish('security:unauthorized_access', {
        resource: 'session_revoke',
        userId: this.context?.userId,
        ip: 'unknown',
        fromState: this.state,
        toState: SessionState.REVOKED,
      });
      throw new Error('Session already revoked');
    }
    return this.transition(SessionState.REVOKED, SessionTrigger.REVOKE, reason);
  }

  /**
   * Panic button — immediate revocation with audit trail
   */
  panic(): SessionTransition {
    return this.revoke('Panic button triggered');
  }

  /**
   * Record an error — auto-suspend after MAX_ERROR_COUNT
   */
  recordError(error: string): SessionTransition | null {
    if (!this.context) return null;
    this.context.errorCount++;
    this.context.lastActivity = Date.now();

    if (this.context.errorCount >= MAX_ERROR_COUNT) {
      publish('security:unauthorized_access', {
        resource: 'session_error_threshold',
        userId: this.context.userId,
        ip: 'unknown',
        fromState: this.state,
        toState: SessionState.SUSPENDED,
      });
      return this.transition(SessionState.SUSPENDED, SessionTrigger.ERROR, `Error threshold reached: ${error}`);
    }
    return null;
  }

  /**
   * Check timeout — auto-suspend if inactive beyond SESSION_TIMEOUT_MS
   */
  checkTimeout(): SessionTransition | null {
    if (!this.context || this.state !== SessionState.ACTIVE) return null;
    if (Date.now() - this.context.lastActivity > SESSION_TIMEOUT_MS) {
      return this.transition(SessionState.SUSPENDED, SessionTrigger.TIMEOUT, 'Session timeout');
    }
    return null;
  }

  /**
   * Internal transition — validates matrix and records audit trail
   */
  private transition(to: SessionState, trigger: SessionTrigger, reason?: string): SessionTransition {
    const allowed = this.validTransitions[this.state];
    if (!allowed.includes(to)) {
      publish('security:privilege_escalation', {
        userId: this.context?.userId || 'unknown',
        fromRole: this.state,
        toRole: to,
      });
      throw new Error(`Invalid transition: ${this.state} → ${to}`);
    }

    const transition: SessionTransition = {
      from: this.state,
      to,
      trigger,
      timestamp: Date.now(),
      ...(reason !== undefined ? { reason } : {}),
    };

    this.state = to;
    this.transitions.push(transition);

    // Publish session event to the real-time SSE bus.
    const sessionId = this.context?.sessionId ?? 'unknown';
    publish(this.eventNameFor(transition.trigger), {
      sessionId,
      from: transition.from,
      to: transition.to,
      trigger: transition.trigger,
      reason: transition.reason,
    });
    return transition;
  }

  /** Map a transition trigger to the SSE event name the dashboard listens for. */
  private eventNameFor(trigger: SessionTrigger): string {
    const map: Record<SessionTrigger, string> = {
      [SessionTrigger.START]: 'session:started',
      [SessionTrigger.PAUSE]: 'session:paused',
      [SessionTrigger.RESUME]: 'session:resumed',
      [SessionTrigger.REVOKE]: 'session:revoked',
      [SessionTrigger.PANIC]: 'session:revoked', // panic is a revocation
      [SessionTrigger.TIMEOUT]: 'session:paused',
      [SessionTrigger.ERROR]: 'session:paused',
    };
    return map[trigger] ?? `session:${trigger.toLowerCase()}`;
  }

  getState(): SessionState {
    return this.state;
  }

  getContext(): SessionContext | null {
    return this.context;
  }

  getTransitions(): SessionTransition[] {
    return [...this.transitions];
  }

  isActive(): boolean {
    return this.state === SessionState.ACTIVE;
  }

  isRevoked(): boolean {
    return this.state === SessionState.REVOKED;
  }
}