'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { SessionStateMachine, SessionState, SessionContext } from '@/lib/session-state-machine';
import { ConfirmationModal } from './ConfirmationModal';

interface ActiveSession {
  id: string;
  name: string;
  status: SessionState;
  copyPercentage: number;
  maxPositionSize: number;
  startedAt: number;
  lastActivity: number;
}

const mockSessions: ActiveSession[] = [
  {
    id: 'sess-1',
    name: 'Algo-Trader Session 1',
    status: SessionState.ACTIVE,
    copyPercentage: 50,
    maxPositionSize: 1000000,
    startedAt: Date.now() - 3600000,
    lastActivity: Date.now() - 300000,
  },
  {
    id: 'sess-2',
    name: 'High-Freq Bot',
    status: SessionState.SUSPENDED,
    copyPercentage: 25,
    maxPositionSize: 500000,
    startedAt: Date.now() - 7200000,
    lastActivity: Date.now() - 1800000,
  },
];

export const ActiveSessionsList = () => {
  const [sessions] = useState<ActiveSession[]>(mockSessions);
  const [revokeModalOpen, setRevokeModalOpen] = useState<string | null>(null);
  const { logout } = useAuthStore();

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (startedAt: number) => {
    const diff = Date.now() - startedAt;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const handleRevoke = (sessionId: string) => {
    setRevokeModalOpen(sessionId);
  };

  const handleConfirmRevoke = () => {
    if (revokeModalOpen) {
      console.log('Revoking session:', revokeModalOpen);
      setRevokeModalOpen(null);
    }
  };

  return (
    <div className="space-y-px">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">active sessions</p>
        <p className="font-mono text-[11px] text-[color:var(--text-secondary)]">
          {sessions.length} total · {sessions.filter((s) => s.status === SessionState.ACTIVE).length} active
        </p>
      </div>

      <div className="border border-obsidian-border bg-obsidian-surface">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`grid grid-cols-1 gap-px lg:grid-cols-12 lg:items-center ${
              session.status === SessionState.ACTIVE ? 'border-l-2 border-l-gold' : 'border-l-2 border-l-gold-dim'
            }`}
          >
            <div className="border-b border-obsidian-border px-4 py-3 lg:col-span-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="font-mono text-sm font-bold text-[color:var(--text-primary)]">{session.name}</p>
                  <span className={`font-mono text-[10px] uppercase tracking-wider ${
                    session.status === SessionState.ACTIVE ? 'text-success' : 'text-warning'
                  }`}>
                    {session.status.toLowerCase()}
                  </span>
                </div>
              </div>
            </div>
            <div className="border-b border-obsidian-border px-4 py-3 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">copy %</p>
                    <p className="font-mono text-xs text-[color:var(--text-primary)]">{session.copyPercentage}%</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">max position</p>
                    <p className="font-mono text-xs text-[color:var(--text-primary)]">{(session.maxPositionSize / 1000000).toFixed(2)}M SOL</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">duration</p>
                    <p className="font-mono text-xs text-[color:var(--text-primary)]">{formatDuration(session.startedAt)}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">last activity</p>
                    <p className="font-mono text-xs text-[color:var(--text-primary)]">{formatTime(session.lastActivity)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(session.id)}
                  className="border border-obsidian-border px-3 py-1.5 font-mono text-[11px] text-[color:var(--text-secondary)] transition-colors hover:border-error hover:text-error"
                >
                  revoke
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmationModal
        isOpen={!!revokeModalOpen}
        onClose={() => setRevokeModalOpen(null)}
        onConfirm={handleConfirmRevoke}
        title="REVOKE SESSION"
        message="This will immediately revoke this session. This action cannot be undone."
        confirmText="REVOKE"
        cancelText="CANCEL"
        variant="danger"
      />
    </div>
  );
};
