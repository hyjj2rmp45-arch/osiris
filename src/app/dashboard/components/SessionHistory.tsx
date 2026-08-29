'use client';

import { useState, useMemo } from 'react';

interface SessionHistoryEntry {
  id: string;
  sessionName: string;
  startedAt: number;
  endedAt: number | null;
  duration: string;
  status: 'completed' | 'revoked' | 'panic' | 'timeout' | 'error';
  tradesExecuted: number;
  totalVolume: number;
  finalPnl: number;
}

const mockHistory: SessionHistoryEntry[] = [
  {
    id: 'hist-1',
    sessionName: 'Algo-Trader Session 1',
    startedAt: Date.now() - 86400000,
    endedAt: Date.now() - 82800000,
    duration: '1h 0m',
    status: 'completed',
    tradesExecuted: 23,
    totalVolume: 45000,
    finalPnl: 125.5,
  },
  {
    id: 'hist-2',
    sessionName: 'High-Freq Bot',
    startedAt: Date.now() - 172800000,
    endedAt: Date.now() - 170000000,
    duration: '46m 40s',
    status: 'revoked',
    tradesExecuted: 12,
    totalVolume: 18500,
    finalPnl: -42.3,
  },
  {
    id: 'hist-3',
    sessionName: 'Copy Trading Pro',
    startedAt: Date.now() - 259200000,
    endedAt: Date.now() - 255000000,
    duration: '1h 10m',
    status: 'completed',
    tradesExecuted: 45,
    totalVolume: 120000,
    finalPnl: 890.75,
  },
  {
    id: 'hist-4',
    sessionName: 'Test Session Alpha',
    startedAt: Date.now() - 345600000,
    endedAt: Date.now() - 345300000,
    duration: '5m',
    status: 'panic',
    tradesExecuted: 2,
    totalVolume: 500,
    finalPnl: -12.0,
  },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'text-success',
    revoked: 'text-warning',
    panic: 'text-error',
    timeout: 'text-[color:var(--text-muted)]',
    error: 'text-error',
  };
  return (
    <span className={`font-mono text-[11px] uppercase tracking-wider ${styles[status] ?? 'text-[color:var(--text-secondary)]'}`}>
      {status}
    </span>
  );
}

function HistoryRow({ entry }: { entry: SessionHistoryEntry }) {
  return (
    <div className="border-b border-obsidian-border/40 last:border-b-0 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-sm font-bold text-[color:var(--text-primary)]">{entry.sessionName}</p>
        <StatusBadge status={entry.status} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">date</p>
          <p className="mt-0.5 font-mono text-xs text-[color:var(--text-secondary)]">{new Date(entry.startedAt).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">duration</p>
          <p className="mt-0.5 font-mono text-xs text-[color:var(--text-secondary)]">{entry.duration}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">trades</p>
          <p className="mt-0.5 font-mono text-xs text-[color:var(--text-secondary)]">{entry.tradesExecuted}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">volume</p>
          <p className="mt-0.5 font-mono text-xs text-[color:var(--text-secondary)]">{entry.totalVolume.toLocaleString()} SOL</p>
        </div>
      </div>
      <div className="mt-2">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">pnl</p>
        <p className={`mt-0.5 font-mono text-xs ${entry.finalPnl >= 0 ? 'text-success' : 'text-error'}`}>
          {entry.finalPnl >= 0 ? '+' : ''}{entry.finalPnl.toFixed(2)} SOL
        </p>
      </div>
    </div>
  );
}

function HistoryTable({ entries, sortField, sortDirection, onSort }: {
  entries: SessionHistoryEntry[];
  sortField: keyof SessionHistoryEntry;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof SessionHistoryEntry) => void;
}) {
  return (
    <table className="w-full font-mono text-xs">
      <thead>
        <tr className="border-b border-obsidian-border text-left text-[color:var(--text-muted)]">
          <th className="px-3 py-2 font-normal cursor-pointer hover:text-[color:var(--text-primary)]" onClick={() => onSort('sessionName')}>session</th>
          <th className="px-3 py-2 font-normal cursor-pointer hover:text-[color:var(--text-primary)]" onClick={() => onSort('startedAt')}>date</th>
          <th className="px-3 py-2 font-normal cursor-pointer hover:text-[color:var(--text-primary)]" onClick={() => onSort('duration')}>duration</th>
          <th className="px-3 py-2 font-normal cursor-pointer hover:text-[color:var(--text-primary)]" onClick={() => onSort('status')}>status</th>
          <th className="px-3 py-2 font-normal text-right cursor-pointer hover:text-[color:var(--text-primary)]" onClick={() => onSort('tradesExecuted')}>trades</th>
          <th className="px-3 py-2 font-normal text-right cursor-pointer hover:text-[color:var(--text-primary)]" onClick={() => onSort('totalVolume')}>volume</th>
          <th className="px-3 py-2 font-normal text-right cursor-pointer hover:text-[color:var(--text-primary)]" onClick={() => onSort('finalPnl')}>pnl</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-obsidian-border/40">
        {entries.map((entry) => (
          <tr key={entry.id} className="transition-colors hover:bg-obsidian-elevated">
            <td className="px-3 py-2.5 text-[color:var(--text-primary)]">{entry.sessionName}</td>
            <td className="px-3 py-2.5 text-[color:var(--text-secondary)]">{new Date(entry.startedAt).toLocaleDateString()}</td>
            <td className="px-3 py-2.5 text-[color:var(--text-secondary)]">{entry.duration}</td>
            <td className="px-3 py-2.5"><StatusBadge status={entry.status} /></td>
            <td className="px-3 py-2.5 text-right text-[color:var(--text-secondary)]">{entry.tradesExecuted}</td>
            <td className="px-3 py-2.5 text-right text-[color:var(--text-secondary)]">{entry.totalVolume.toLocaleString()} SOL</td>
            <td className={`px-3 py-2.5 text-right ${entry.finalPnl >= 0 ? 'text-success' : 'text-error'}`}>
              {entry.finalPnl >= 0 ? '+' : ''}{entry.finalPnl.toFixed(2)} SOL
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const SessionHistory = () => {
  const [history] = useState<SessionHistoryEntry[]>(mockHistory);
  const [sortField, setSortField] = useState<keyof SessionHistoryEntry>('startedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof SessionHistoryEntry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedHistory = useMemo(() => [...history].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * (sortDirection === 'asc' ? 1 : -1);
    }
    const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''));
    return sortDirection === 'asc' ? cmp : -cmp;
  }), [history, sortField, sortDirection]);

  return (
    <div className="space-y-px">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">session history</p>
      </div>

      <div className="border border-obsidian-border bg-obsidian-surface">
        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <HistoryTable
            entries={sortedHistory}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden">
          {sortedHistory.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
};