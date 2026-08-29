'use client';

import Link from 'next/link';
import TickerStrip from './TickerStrip';
import SmartCta from './SmartCta';

const pairs = [
  { pair: 'SOL/USDC', side: 'LONG', size: '2.40', entry: '203.41', pnl: '+18.72', up: true },
  { pair: 'BONK/SOL', side: 'LONG', size: '18.4M', entry: '0.0000182', pnl: '+4.21', up: true },
  { pair: 'WIF/USDC', side: 'SHORT', size: '42.0', entry: '2.914', pnl: '-1.33', up: false },
  { pair: 'JUP/USDC', side: 'LONG', size: '298.2', entry: '1.082', pnl: '+9.44', up: true },
];

const fills = [
  { time: '14:22:03', pair: 'SOL/USDC', side: 'BUY', price: '203.41', qty: '1.20' },
  { time: '14:18:47', pair: 'JUP/USDC', side: 'BUY', price: '1.082', qty: '298.2' },
  { time: '14:14:22', pair: 'WIF/USDC', side: 'SELL', price: '2.914', qty: '42.0' },
  { time: '14:09:11', pair: 'BONK/SOL', side: 'BUY', price: '0.0000182', qty: '18.4M' },
  { time: '14:02:56', pair: 'RAY/USDC', side: 'SELL', price: '4.213', qty: '12.8' },
];

const stats = [
  { v: '<500ms', l: 'route time' },
  { v: '20+', l: 'DEX venues' },
  { v: '0', l: 'MEV attacks landed' },
  { v: '100%', l: 'honeypots caught' },
];

export default function Hero() {
  return (
    <>
      <TickerStrip />

      <section className="relative bg-obsidian pt-10 sm:pt-12 md:pt-16 pb-8 sm:pb-12">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          {/* Top bar: command line prompt */}
          <p className="font-mono text-[10px] sm:text-[11px] text-[color:var(--text-muted)]">
            ~/osiris <span className="text-gold">$</span> start --network mainnet --tier <span className="text-[color:var(--text-muted)]">{'monthly | lifetime'}</span>
          </p>

          {/* Headline */}
          <h1 className="mt-3 font-mono text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight">
            The Solana terminal that
            <br />
            <span className="text-gold">trades while you sleep.</span>
          </h1>

          {/* Sub-headline */}
          <p className="mt-4 max-w-[56ch] font-mono text-sm sm:text-base leading-relaxed text-[color:var(--text-secondary)]">
            Sessions run your strategy around the clock. MEV-protected routing, honeypot
            screening, and a circuit breaker that halts everything the moment your loss
            limit trips. You set the rules once. It follows them exactly.
          </p>

          {/* Smart CTA - "Start trading" if not subscribed, "Open terminal" if subscribed */}
          <SmartCta />

          {/* Trust signals */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-[10px] sm:text-[11px] font-mono text-[color:var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Live on mainnet-beta
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              0 MEV attacks landed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              100% honeypots caught
            </span>
            <span className="flex items-center gap-1.5 border-l border-obsidian-border pl-4">
              <span className="text-gold">~0.3 SOL</span> / month
            </span>
          </div>
        </div>

        {/* Product IS the hero: terminal mock */}
        <div className="mx-auto mt-10 sm:mt-12 max-w-[1280px] px-4 sm:px-6 lg:px-8 pb-16">
          <div className="border border-obsidian-border bg-obsidian-surface overflow-hidden">
            {/* Terminal chrome */}
            <div className="flex items-center justify-between border-b border-obsidian-border bg-obsidian-elevated px-3 sm:px-4 py-2.5">
              <div className="flex items-center gap-3 font-mono text-[10px] sm:text-[11px]">
                <span className="text-gold">OSIRIS</span>
                <span className="text-[color:var(--text-muted)]">mainnet-beta</span>
                <span className="text-[color:var(--text-muted)]">v1.0.0</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[9px] sm:text-[10px] text-[color:var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  live
                </span>
                <span className="flex items-center gap-1.5 text-gold">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                  {'<500ms'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px]">
              {/* Left: positions + session log */}
              <div className="p-4 sm:p-5">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">
                  open positions
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-xs sm:text-sm" role="table">
                    <thead>
                      <tr className="border-b border-obsidian-border/60 text-left text-[color:var(--text-muted)]">
                        <th className="px-3 py-2.5 font-normal">pair</th>
                        <th className="px-2 py-2.5 font-normal">side</th>
                        <th className="px-2 py-2.5 font-normal text-right">size</th>
                        <th className="px-2 py-2.5 font-normal text-right">entry</th>
                        <th className="px-3 py-2.5 font-normal text-right">pnl</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-obsidian-border/30">
                      {pairs.map((p) => (
                        <tr key={p.pair + p.side} className="transition-colors hover:bg-obsidian-elevated/50">
                          <td className="px-3 py-2.5 text-[color:var(--text-primary)]">{p.pair}</td>
                          <td className="px-2 py-2.5">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-medium ${p.side === 'LONG' ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}`}>
                              {p.side}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-right text-[color:var(--text-secondary)]">{p.size}</td>
                          <td className="px-2 py-2.5 text-right text-[color:var(--text-secondary)]">{p.entry}</td>
                          <td className={`px-3 py-2.5 text-right font-medium ${p.up ? 'text-success' : 'text-error'}`}>{p.pnl}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="mt-5 mb-3 font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">
                  session log
                </p>
                <div className="divide-y divide-obsidian-border/30">
                  {fills.map((f) => (
                    <div key={f.time} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-1 py-2.5 font-mono text-[10px] sm:text-[11px] transition-colors hover:bg-obsidian-elevated/50">
                      <span className="text-[color:var(--text-muted)]">{f.time}</span>
                      <span className="text-[color:var(--text-primary)]">{f.pair}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-medium ${f.side === 'BUY' ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}`}>
                        {f.side}
                      </span>
                      <span className="text-right text-[color:var(--text-secondary)]">{f.price} <span className="text-[color:var(--text-muted)]">×{f.qty}</span></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: session status + stats */}
              <div className="border-l border-obsidian-border lg:border-l lg:border-t-0 bg-obsidian-elevated/30">
                <div className="p-4 sm:p-5">
                  <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">
                    active session
                  </p>
                  <div className="space-y-4 font-mono text-xs sm:text-sm">
                    <div>
                      <p className="text-[color:var(--text-muted)]">name</p>
                      <p className="mt-0.5 text-[color:var(--text-primary)] font-medium">aggressive-snipes-01</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[color:var(--text-muted)]">pnl today</p>
                        <p className="mt-0.5 text-success font-medium">+2.31 SOL</p>
                      </div>
                      <div>
                        <p className="text-[color:var(--text-muted)]">win rate</p>
                        <p className="mt-0.5 text-[color:var(--text-primary)] font-medium">68.2%</p>
                      </div>
                      <div>
                        <p className="text-[color:var(--text-muted)]">budget used</p>
                        <p className="mt-0.5 text-[color:var(--text-primary)] font-medium">2.34 / 5.00</p>
                      </div>
                      <div>
                        <p className="text-[color:var(--text-muted)]">breaker</p>
                        <p className="mt-0.5 text-success font-medium">armed</p>
                      </div>
                    </div>
                    <div className="border-t border-obsidian-border pt-4">
                      <p className="text-[color:var(--text-muted)]">circuit breaker</p>
                      <div className="mt-2 h-1.5 w-full bg-obsidian-surface rounded-full overflow-hidden">
                        <div className="h-full w-[47%] bg-gold rounded-full transition-all duration-500" />
                      </div>
                      <p className="mt-1.5 text-[10px] text-[color:var(--text-muted)]">47% of daily loss limit</p>
                    </div>
                  </div>
                </div>

                {/* Stats row - bottom */}
                <dl className="mx-4 mb-4 grid grid-cols-2 gap-3 border-t border-obsidian-border pt-4">
                  {stats.map((s) => (
                    <div key={s.l} className="bg-obsidian-surface/50 px-3 py-3 text-center">
                      <dd className="font-mono text-lg sm:text-xl text-gold font-bold">{s.v}</dd>
                      <dt className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-[color:var(--text-muted)]">{s.l}</dt>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
