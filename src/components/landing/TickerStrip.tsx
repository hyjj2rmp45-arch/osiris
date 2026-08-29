'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Landing ticker: smooth horizontal scroll of all symbols.
 * Duplicates the list for seamless looping. No manual scrollbar.
 */
const symbols = [
  { sym: 'SOL', base: 203.41, dp: 2 },
  { sym: 'ETH', base: 3847.2, dp: 2 },
  { sym: 'BTC', base: 97421, dp: 0 },
  { sym: 'JUP', base: 1.082, dp: 3 },
  { sym: 'WIF', base: 2.914, dp: 3 },
  { sym: 'BONK', base: 0.0000182, dp: 7 },
  { sym: 'RAY', base: 4.213, dp: 3 },
  { sym: 'ORCA', base: 3.87, dp: 2 },
];

function TickerCell({ sym, base, dp }: { sym: string; base: number; dp: number }) {
  const [price, setPrice] = useState(base);
  const [dir, setDir] = useState<'up' | 'down' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drift = useRef((Math.random() - 0.5) * 0.06);

  useEffect(() => {
    function tick() {
      setPrice((prev) => {
        const change = prev * (drift.current + (Math.random() - 0.5) * 0.003);
        setDir(change >= 0 ? 'up' : 'down');
        return prev + change;
      });
      timer.current = setTimeout(tick, 1200 + Math.random() * 1800);
    }
    timer.current = setTimeout(tick, 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const pct = ((price - base) / base) * 100;
  const flash = dir === 'up' ? 'text-success' : dir === 'down' ? 'text-error' : 'text-[color:var(--text-primary)]';

  return (
    <div className="flex shrink-0 items-center gap-2 font-mono text-xs tabular-nums">
      <span className="text-[color:var(--text-muted)]">{sym}</span>
      <span className={`transition-colors duration-700 ${flash}`}>{price.toFixed(dp)}</span>
      <span className={pct >= 0 ? 'text-success' : 'text-error'}>
        {pct >= 0 ? '+' : ''}
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

export default function TickerStrip() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;
    const width = node.scrollWidth;
    if (width > 0) {
      setDuration(Math.max(20, width / 60));
    }
  }, []);

  const items = [...symbols, ...symbols];

  return (
    <div className="border-b border-obsidian-border bg-obsidian-surface/60">
      <div className="mx-auto flex max-w-[1200px] items-center gap-6 overflow-hidden px-4 py-2.5 sm:px-6">
        <div className="relative w-full overflow-hidden">
          <div
            ref={trackRef}
            className="flex items-center gap-8 whitespace-nowrap"
            style={{
              animation: `ticker-scroll ${duration}s linear infinite`,
              width: 'max-content',
            }}
          >
            {items.map((s, i) => (
              <TickerCell key={`${s.sym}-${i}`} {...s} />
            ))}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 border-l border-obsidian-border pl-4 font-mono text-[10px] text-[color:var(--text-muted)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-success opacity-75 animate-ping" />
            <span className="relative rounded-full bg-success" />
          </span>
          <span className="text-success">status:</span>
          <span>online</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}