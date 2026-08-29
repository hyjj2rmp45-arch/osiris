'use client';

import { motion, useReducedMotion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1] as const;

const positions = [
  { pair: 'SOL/USDC', side: 'LONG', size: '2.40', entry: '203.41', pnl: '+18.72', up: true },
  { pair: 'BONK/SOL', side: 'LONG', size: '18.4M', entry: '0.0000182', pnl: '+4.21', up: true },
  { pair: 'WIF/USDC', side: 'SHORT', size: '42.0', entry: '2.914', pnl: '-1.33', up: false },
];

const fills = [
  { time: '14:22:03', pair: 'SOL/USDC', side: 'BUY', price: '203.41', qty: '1.20' },
  { time: '14:18:47', pair: 'JUP/USDC', side: 'BUY', price: '1.082', qty: '298.2' },
  { time: '14:14:22', pair: 'WIF/USDC', side: 'SELL', price: '2.914', qty: '42.0' },
];

const orderBook = {
  asks: [
    { price: '203.42', size: '0.85', total: '0.85' },
    { price: '203.43', size: '1.56', total: '2.41' },
    { price: '203.44', size: '2.23', total: '4.64' },
    { price: '203.45', size: '0.67', total: '5.31' },
    { price: '203.46', size: '1.89', total: '7.20' },
  ],
  bestBid: { price: '203.39', size: '1.24', total: '1.24' },
  bidsRest: [
    { price: '203.38', size: '2.81', total: '4.05' },
    { price: '203.37', size: '0.95', total: '5.00' },
    { price: '203.36', size: '3.42', total: '8.42' },
    { price: '203.35', size: '1.08', total: '9.50' },
  ],
  spread: '0.03',
};

export default function DashboardPreview() {
  const reduce = useReducedMotion();

  return (
    <section className="border-t border-obsidian-border bg-obsidian-light py-16" aria-label="Dashboard preview">
      <div className="mx-auto max-w-[1200px] px-6">
        <h2 className="font-mono text-xl font-bold tracking-tight text-[color:var(--text-primary)]">Inside the terminal</h2>
        <p className="mt-2 font-mono text-xs text-[color:var(--text-secondary)]">
          Overview, positions, order book, fills. All on one screen.
        </p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mt-8 overflow-hidden rounded-sm border border-obsidian-border"
        >
          {/* Shell chrome */}
          <div className="flex items-center justify-between border-b border-obsidian-border bg-obsidian-elevated px-4 py-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-error" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                <span className="h-2.5 w-2.5 rounded-full bg-success" />
              </div>
              <span className="font-mono text-[11px] text-[color:var(--text-muted)]">osiris.app/dashboard</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-[color:var(--text-muted)]">Spread: {orderBook.spread}</span>
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="font-mono text-[10px] text-success">LIVE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 bg-obsidian-surface lg:grid-cols-[220px_1fr_1fr]">
            {/* Sidebar */}
            <nav aria-hidden="true" className="hidden border-r border-obsidian-border bg-obsidian-elevated p-3 lg:block">
              <p className="mb-4 px-2 font-semibold text-sm text-gold">OSIRIS</p>
              <ul className="space-y-0.5 text-[12px]">
                {['Overview', 'Trading', 'Copy Trading', 'Analytics', 'Settings'].map((item, i) => (
                  <li
                    key={item}
                    className={`rounded-sm px-2 py-1.5 ${
                      i === 0 ? 'bg-gold/10 text-gold' : 'text-[color:var(--text-secondary)]'
                    }`}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </nav>

            {/* Center: Positions + Fills */}
            <div className="divide-y divide-obsidian-border p-4">
              {/* Metric row */}
              <div className="grid grid-cols-2 gap-2 pb-3 sm:grid-cols-4">
                {[
                  { label: 'Balance', value: '12.45 SOL', delta: '+5.23%', up: true },
                  { label: 'PNL 24h', value: '+2.31 SOL', delta: '+18.4%', up: true },
                  { label: 'Positions', value: '7 tokens', delta: '', up: true },
                  { label: 'Win rate', value: '68.2%', delta: '+3.1%', up: true },
                ].map((m) => (
                  <div key={m.label} className="rounded-sm border border-obsidian-border bg-obsidian-elevated p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">{m.label}</p>
                    <p className="mt-0.5 font-mono text-xs">{m.value}</p>
                    {m.delta && (
                      <p className={`font-mono text-[10px] ${m.up ? 'text-success' : 'text-error'}`}>{m.delta}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Positions */}
              <div className="py-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-[color:var(--text-muted)]">positions</p>
                  <span className="font-mono text-[10px] text-success">3 open</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-obsidian-border/60 text-left text-[color:var(--text-muted)]">
                        <th className="pb-1.5 pr-2 font-normal">pair</th>
                        <th className="pb-1.5 pr-2 font-normal">side</th>
                        <th className="pb-1.5 pr-2 font-normal">size</th>
                        <th className="pb-1.5 pr-2 font-normal">entry</th>
                        <th className="pb-1.5 text-right font-normal">pnl</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-obsidian-border/40">
                      {positions.map((r) => (
                        <tr key={r.pair + r.side} className="transition-colors hover:bg-obsidian-elevated">
                          <td className="py-1.5 pr-2">{r.pair}</td>
                          <td className="py-1.5 pr-2">
                            <span className={`rounded-sm px-1 py-0.5 ${r.side === 'LONG' ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}`}>
                              {r.side}
                            </span>
                          </td>
                          <td className="py-1.5 pr-2 text-[color:var(--text-secondary)]">{r.size}</td>
                          <td className="py-1.5 pr-2 text-[color:var(--text-secondary)]">{r.entry}</td>
                          <td className={`py-1.5 text-right ${r.up ? 'text-success' : 'text-error'}`}>{r.pnl}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent fills */}
              <div className="py-3">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[color:var(--text-muted)]">recent fills</p>
                <div className="space-y-0.5">
                  {fills.map((f) => (
                    <div
                      key={f.time}
                      className="flex items-center gap-3 rounded-sm px-2 py-1.5 font-mono text-[11px] transition-colors hover:bg-obsidian-elevated"
                    >
                      <span className="text-[color:var(--text-muted)]">{f.time}</span>
                      <span className="text-[color:var(--text-primary)]">{f.pair}</span>
                      <span className={f.side === 'BUY' ? 'text-success' : 'text-error'}>{f.side}</span>
                      <span className="text-[color:var(--text-secondary)]">{f.price}</span>
                      <span className="ml-auto text-[color:var(--text-secondary)]">{f.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Order book */}
            <div className="border-t border-obsidian-border p-4 lg:border-t-0 lg:border-l">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-[11px] uppercase tracking-wider text-[color:var(--text-muted)]">Order book · SOL/USDC</p>
                <span className="font-mono text-[10px] text-[color:var(--text-secondary)]">Spread {orderBook.spread}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-obsidian-border/60 text-left text-[color:var(--text-muted)]">
                      <th className="pb-1.5 pr-2 font-normal">Price</th>
                      <th className="pb-1.5 pr-2 font-normal text-right">Size</th>
                      <th className="pb-1.5 text-right font-normal">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-error">
                    {orderBook.asks.map((a) => (
                      <tr key={a.price} className="transition-colors hover:bg-error/5">
                        <td className="py-1 pr-2">{a.price}</td>
                        <td className="py-1 pr-2 text-right">{a.size}</td>
                        <td className="py-1 text-right">{a.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tbody>
                    <tr className="border-y border-obsidian-border bg-obsidian-elevated">
                      <td className="py-1.5 pr-2 font-medium text-[color:var(--text-primary)]">{orderBook.bestBid.price}</td>
                      <td className="py-1.5 pr-2 text-right text-[color:var(--text-secondary)]">{orderBook.bestBid.size}</td>
                      <td className="py-1.5 text-right text-[color:var(--text-secondary)]">{orderBook.bestBid.total}</td>
                    </tr>
                  </tbody>
                  <tbody className="text-success">
                    {orderBook.bidsRest.map((b) => (
                      <tr key={b.price} className="transition-colors hover:bg-success/5">
                        <td className="py-1 pr-2">{b.price}</td>
                        <td className="py-1 pr-2 text-right">{b.size}</td>
                        <td className="py-1 text-right">{b.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
