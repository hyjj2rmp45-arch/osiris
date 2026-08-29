'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

const EASE = [0.16, 1, 0.3, 1] as const;

const metrics = [
  { label: 'balance', value: '12.45 SOL', delta: '+5.23%', up: true },
  { label: 'pnl 24h', value: '+2.31 SOL', delta: '+18.4%', up: true },
  { label: 'positions', value: '7', delta: '3 long / 2 short', up: true },
  { label: 'win rate', value: '68.2%', delta: '+3.1%', up: true },
];

const positions = [
  { pair: 'SOL/USDC', side: 'LONG', size: '2.40', entry: '203.41', mark: '203.88', pnl: '+1.13', up: true },
  { pair: 'BONK/SOL', side: 'LONG', size: '18.4M', entry: '0.0000182', mark: '0.0000186', pnl: '+4.21', up: true },
  { pair: 'WIF/USDC', side: 'SHORT', size: '42.0', entry: '2.914', mark: '2.941', pnl: '-1.33', up: false },
  { pair: 'JUP/USDC', side: 'LONG', size: '298.2', entry: '1.082', mark: '1.114', pnl: '+9.44', up: true },
];

const fills = [
  { time: '14:22:03', pair: 'SOL/USDC', side: 'BUY', price: '203.41', qty: '1.20' },
  { time: '14:18:47', pair: 'JUP/USDC', side: 'BUY', price: '1.082', qty: '298.2' },
  { time: '14:14:22', pair: 'WIF/USDC', side: 'SELL', price: '2.914', qty: '42.0' },
  { time: '14:09:11', pair: 'BONK/SOL', side: 'BUY', price: '0.0000182', qty: '18.4M' },
  { time: '14:02:56', pair: 'RAY/USDC', side: 'SELL', price: '4.213', qty: '12.8' },
  { time: '13:58:31', pair: 'ORCA/USDC', side: 'BUY', price: '3.87', qty: '9.4' },
];

const pnlBars = [
  34, 48, 40, 62, 55, 78, 70, 92, 84, 100, 88, 96, 74, 82, 90, 68, 76, 88, 94, 72,
];

export default function Overview() {
  const reduce = useReducedMotion();

  return (
    <div className="space-y-px bg-obsidian-border">
      {/* Metric strip: hairline grid, mono, dense */}
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="grid grid-cols-2 gap-px lg:grid-cols-4"
      >
        {metrics.map((m) => (
          <div key={m.label} className="bg-obsidian-surface px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">{m.label}</p>
            <p className="mt-1 font-mono text-base font-bold text-[color:var(--text-primary)]">{m.value}</p>
            {m.delta && <p className={`mt-0.5 font-mono text-[11px] ${m.up ? 'text-success' : 'text-error'}`}>{m.delta}</p>}
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-px lg:grid-cols-[1fr_360px]">
        {/* Left column: positions + pnl chart */}
        <div className="space-y-px">
          {/* Positions */}
          <section aria-label="Open positions" className="bg-obsidian-surface">
            <div className="flex items-center justify-between border-b border-obsidian-border px-4 py-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">open positions</p>
              <Link href="/dashboard/trading" className="font-mono text-[11px] text-gold hover:text-gold-pale">
                manage &rarr;
              </Link>
            </div>
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-obsidian-border/60 text-left text-[color:var(--text-muted)]">
                  <th className="px-4 py-2 font-normal">pair</th>
                  <th className="px-2 py-2 font-normal">side</th>
                  <th className="px-2 py-2 font-normal text-right">size</th>
                  <th className="px-2 py-2 font-normal text-right">entry</th>
                  <th className="px-2 py-2 font-normal text-right">mark</th>
                  <th className="px-4 py-2 font-normal text-right">pnl</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-border/40">
                {positions.map((p) => (
                  <tr key={p.pair + p.side} className="transition-colors hover:bg-obsidian-elevated">
                    <td className="px-4 py-2 text-[color:var(--text-primary)]">{p.pair}</td>
                    <td className={`px-2 py-2 ${p.side === 'LONG' ? 'text-success' : 'text-error'}`}>{p.side}</td>
                    <td className="px-2 py-2 text-right text-[color:var(--text-secondary)]">{p.size}</td>
                    <td className="px-2 py-2 text-right text-[color:var(--text-secondary)]">{p.entry}</td>
                    <td className="px-2 py-2 text-right text-[color:var(--text-secondary)]">{p.mark}</td>
                    <td className={`px-4 py-2 text-right ${p.up ? 'text-success' : 'text-error'}`}>{p.pnl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* PNL chart */}
          <section aria-label="PNL chart" className="bg-obsidian-surface">
            <div className="flex items-center justify-between border-b border-obsidian-border px-4 py-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">pnl, last 20 sessions</p>
              <p className="font-mono text-xs text-gold">+9.84 SOL</p>
            </div>
            <div className="p-4">
              <div className="flex h-32 items-end gap-px" aria-hidden="true">
                {pnlBars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gold/70 transition-colors hover:bg-gold"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] text-[color:var(--text-muted)]">
                <span>-20 sessions</span>
                <span>today</span>
              </div>
            </div>
          </section>
        </div>

        {/* Right column: fills */}
        <section aria-label="Recent fills" className="bg-obsidian-surface">
          <div className="border-b border-obsidian-border px-4 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">execution log</p>
          </div>
          <div className="divide-y divide-obsidian-border/40">
            {fills.map((f) => (
              <div key={f.time} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-4 py-2 font-mono text-[11px] transition-colors hover:bg-obsidian-elevated">
                <span className="text-[color:var(--text-muted)]">{f.time}</span>
                <span>
                  <span className="text-[color:var(--text-primary)]">{f.pair}</span>{' '}
                  <span className={f.side === 'BUY' ? 'text-success' : 'text-error'}>{f.side}</span>
                </span>
                <span className="text-right text-[color:var(--text-secondary)]">
                  {f.price} <span className="text-[color:var(--text-muted)]">×{f.qty}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-obsidian-border p-3">
            <p className="font-mono text-[10px] leading-relaxed text-[color:var(--text-muted)]">
              demo data. connect wallet + fund session for live execution.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
