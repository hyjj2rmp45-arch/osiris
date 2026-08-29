'use client';

import { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const monthly = [
  { month: 'Mar', pnl: 0.51 },
  { month: 'Apr', pnl: 1.12 },
  { month: 'May', pnl: 0.87 },
  { month: 'Jun', pnl: -0.34 },
  { month: 'Jul', pnl: 1.45 },
  { month: 'Aug', pnl: 1.92 },
];

const distribution = [
  { name: 'manual', value: 45, color: '#D4AF37' },
  { name: 'copy', value: 35, color: '#8C7B00' },
  { name: 'bot', value: 20, color: '#2A2A3A' },
];

const topTokens = [
  { token: 'BONK', pnl: '+0.89', trades: 23 },
  { token: 'JUP', pnl: '+0.67', trades: 18 },
  { token: 'RAY', pnl: '+0.45', trades: 12 },
  { token: 'ORCA', pnl: '+0.23', trades: 8 },
  { token: 'MSOL', pnl: '+0.12', trades: 5 },
];

function LiveTimestamp() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-[10px] text-[color:var(--text-muted)]">
      updated {secs === 0 ? 'just now' : `${secs}s`}
    </span>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-px">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">analytics</p>
          <h2 className="mt-1 font-mono text-base font-bold text-[color:var(--text-primary)]">performance</h2>
        </div>
        <div className="flex items-center gap-3">
          <LiveTimestamp />
        </div>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 gap-px border border-obsidian-border bg-obsidian-border lg:grid-cols-4">
        {[
          { label: 'total trades', value: '147', delta: '+12%' },
          { label: 'win rate', value: '68.2%', delta: '+3.1%' },
          { label: 'avg pnl / trade', value: '+0.12 SOL', delta: '+8.4%' },
          { label: 'max drawdown', value: '-4.2%', delta: '-1.3%' },
        ].map((m) => (
          <div key={m.label} className="bg-obsidian-surface px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">{m.label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-[color:var(--text-primary)]">{m.value}</p>
            <p className={`mt-0.5 font-mono text-[11px] ${m.delta.startsWith('+') ? 'text-success' : 'text-error'}`}>{m.delta}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-px lg:grid-cols-2">
        {/* Monthly PnL */}
        <section aria-label="Monthly PNL" className="border border-obsidian-border bg-obsidian-surface">
          <div className="border-b border-obsidian-border px-4 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">monthly pnl (SOL)</p>
          </div>
          <div className="p-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="month" tick={{ fill: '#5A5560', fontSize: 11 }} axisLine={{ stroke: '#1E1E2A' }} tickLine={false} />
                  <YAxis tick={{ fill: '#5A5560', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(212,175,55,0.06)' }}
                    contentStyle={{ background: '#14141C', border: '1px solid #1E1E2A', borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    labelStyle={{ color: '#A09B8C' }}
                    itemStyle={{ color: '#F0EDE5' }}
                  />
                  <Bar dataKey="pnl" maxBarSize={36}>
                    {monthly.map((m) => (
                      <Cell key={m.month} fill={m.pnl >= 0 ? '#2D8A4E' : '#C0392B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Trade distribution */}
        <section aria-label="Trade distribution" className="border border-obsidian-border bg-obsidian-surface">
          <div className="border-b border-obsidian-border px-4 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">distribution</p>
          </div>
          <div className="p-4">
            <ul className="space-y-3">
              {distribution.map((d) => (
                <li key={d.name}>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="flex items-center gap-2 text-[color:var(--text-secondary)]">
                      <span aria-hidden="true" className="h-2 w-2" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="text-[color:var(--text-primary)]">{d.value}%</span>
                  </div>
                  <div className="mt-1.5 h-2 bg-obsidian-elevated">
                    <div className="h-full" style={{ width: `${d.value}%`, background: d.color }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Top tokens */}
        <section aria-label="Top performing tokens" className="border border-obsidian-border bg-obsidian-surface lg:col-span-2">
          <div className="border-b border-obsidian-border px-4 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">top tokens</p>
          </div>
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-obsidian-border text-left text-[color:var(--text-muted)]">
                <th className="px-4 py-2 font-normal">token</th>
                <th className="px-3 py-2 font-normal text-right">pnl</th>
                <th className="px-4 py-2 font-normal text-right">trades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-border/40">
              {topTokens.map((t) => (
                <tr key={t.token} className="transition-colors hover:bg-obsidian-elevated">
                  <td className="px-4 py-2.5 text-[color:var(--text-primary)]">{t.token}</td>
                  <td className="px-3 py-2.5 text-right text-success">{t.pnl} SOL</td>
                  <td className="px-4 py-2.5 text-right text-[color:var(--text-secondary)]">{t.trades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
