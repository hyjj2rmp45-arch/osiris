'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Live price that flashes green/red on change — the "this is live" signal
 * every pro terminal uses. Demo: jitters around a base price every 2s.
 * Swap the interval for a WebSocket feed when wiring real data.
 */
export function LivePrice({ base, symbol }: { base: number; symbol: string }) {
  const [price, setPrice] = useState(base);
  const [dir, setDir] = useState<'up' | 'down' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function tick() {
      setPrice((prev) => {
        const change = prev * (Math.random() - 0.5) * 0.004; // ±0.2%
        setDir(change >= 0 ? 'up' : 'down');
        return prev + change;
      });
      timer.current = setTimeout(tick, 1500 + Math.random() * 1500);
    }
    timer.current = setTimeout(tick, 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const flash =
    dir === 'up'
      ? 'text-success bg-success/10'
      : dir === 'down'
        ? 'text-error bg-error/10'
        : 'text-[color:var(--text-primary)]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs tabular-nums transition-colors duration-500 ${flash}`}
      aria-label={`${symbol} price ${price.toFixed(2)}`}
    >
      <span className="text-[color:var(--text-muted)]">{symbol}</span>
      {price.toFixed(2)}
    </span>
  );
}
