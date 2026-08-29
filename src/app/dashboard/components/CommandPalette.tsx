'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Command = {
  id: string;
  label: string;
  hint: string;
  action: () => void;
};

const PAGES = [
  { path: '/dashboard', label: 'overview', hint: 'portfolio, positions, pnl' },
  { path: '/dashboard/trading', label: 'sessions', hint: 'start, pause, revoke trading sessions' },
  { path: '/dashboard/copy-trading', label: 'copy', hint: 'manage copy targets' },
  { path: '/dashboard/alerts', label: 'alerts', hint: 'security + trade notifications' },
  { path: '/dashboard/analytics', label: 'performance', hint: 'pnl analytics, win rate' },
  { path: '/dashboard/settings', label: 'settings', hint: 'wallet, security, api keys' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const router = useRouter();

  const commands: Command[] = PAGES.map((p) => ({
    id: p.path,
    label: p.label,
    hint: p.hint,
    action: () => router.push(p.path),
  }));

  const filtered = commands.filter(
    (c) =>
      c.label.includes(query.toLowerCase()) ||
      c.hint.toLowerCase().includes(query.toLowerCase()),
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelected(0);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
      if (e.key === 'Enter' && filtered[selected]) {
        filtered[selected].action();
        close();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, selected, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh]"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-md border border-obsidian-muted bg-obsidian-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-obsidian-border px-3 py-2.5">
          <span className="font-mono text-sm text-gold">$</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            placeholder="type a command..."
            className="w-full bg-transparent font-mono text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none"
            aria-label="Command input"
          />
          <kbd className="border border-obsidian-border px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--text-muted)]">
            esc
          </kbd>
        </div>

        <ul className="max-h-72 overflow-y-auto py-1">
          {filtered.map((c, i) => (
            <li key={c.id}>
              <button
                onClick={() => {
                  c.action();
                  close();
                }}
                onMouseEnter={() => setSelected(i)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left font-mono text-sm transition-colors ${
                  i === selected
                    ? 'cmd-palette-selected'
                    : 'text-[color:var(--text-secondary)] hover:bg-obsidian-surface'
                }`}
              >
                <span>
                  {c.label}
                  {i === selected && <span className="ml-2 text-[10px] text-[color:var(--text-muted)]">&crarr;</span>}
                </span>
                <span className="text-[11px] text-[color:var(--text-muted)]">{c.hint}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-4 text-center font-mono text-xs text-[color:var(--text-muted)]">
              no matching command
            </li>
          )}
        </ul>

        <div className="flex items-center gap-3 border-t border-obsidian-border px-3 py-1.5 font-mono text-[10px] text-[color:var(--text-muted)]">
          <span>&uarr;&darr; navigate</span>
          <span>&crarr; run</span>
          <span className="ml-auto">ctrl+k</span>
        </div>
      </div>
    </div>
  );
}
