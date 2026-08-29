'use client';

import Link from 'next/link';

const features = [
  {
    name: 'Lightning execution',
    spec: 'Sub-500ms routing across 20+ DEXs with priority fee optimization and multi-RPC failover.',
    metric: '<500ms',
    metricLabel: 'route time',
    tag: 'core',
  },
  {
    name: 'MEV protection',
    spec: 'Anti-sandwich routing with private transaction paths and automatic fallback.',
    metric: '0',
    metricLabel: 'mev attacks',
    tag: 'security',
  },
  {
    name: 'Honeypot screening',
    spec: 'Contract bytecode analysis, transfer function verification, liquidity lock checks.',
    metric: '85%',
    metricLabel: 'caught in testing',
    tag: 'security',
  },
  {
    name: 'Copy trading',
    spec: 'Mirror proven wallets with per-target allocation caps, stop-loss, and win-rate tracking.',
    metric: '10',
    metricLabel: 'copy targets',
    tag: 'trading',
  },
  {
    name: 'Circuit breaker',
    spec: 'Configurable drawdown %, daily loss SOL limit, consecutive loss count. Auto-halt on trigger.',
    metric: '24/7',
    metricLabel: 'protection',
    tag: 'risk',
  },
  {
    name: 'Telegram bot',
    spec: 'Execute trades, monitor PNL, and receive security alerts from your phone.',
    metric: 'AFK',
    metricLabel: 'trading',
    tag: 'mobile',
  },
  {
    name: 'Real-time PNL',
    spec: 'Live portfolio value across 24h, 7d, 30d, and all-time views. Per-token breakdown.',
    metric: 'live',
    metricLabel: 'updates',
    tag: 'analytics',
  },
  {
    name: 'Custom sessions',
    spec: 'Named strategies with per-session budget allocation and PNL tracking.',
    metric: '∞',
    metricLabel: 'strategies',
    tag: 'trading',
  },
  {
    name: 'Slippage guard',
    spec: 'Per-trade and session slippage limits with automatic cancel-and-retry.',
    metric: '0.5%',
    metricLabel: 'default cap',
    tag: 'risk',
  },
];

const tagStyles: Record<string, { color: string; border: string }> = {
  core: { color: 'text-gold', border: 'border-gold/30' },
  security: { color: 'text-success', border: 'border-success/30' },
  trading: { color: 'text-[#5bc0de]', border: 'border-[#5bc0de]/30' },
  risk: { color: 'text-warning', border: 'border-warning/30' },
  mobile: { color: 'text-[#b07cd8]', border: 'border-[#b07cd8]/30' },
  analytics: { color: 'text-[#e06c75]', border: 'border-[#e06c75]/30' },
};

export default function Features() {
  return (
    <section id="features" className="border-t border-obsidian-border py-16" aria-labelledby="features-heading">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">capabilities</p>
            <h2 id="features-heading" className="mt-1 font-mono text-xl font-bold tracking-tight text-[color:var(--text-primary)]">
              Full feature set
            </h2>
            <p className="mt-2 max-w-2xl font-mono text-sm text-[color:var(--text-secondary)]">
              Every feature is designed for speed, safety, and automation. No fluff, no hidden fees—just trading infrastructure.
            </p>
          </div>
          <p className="hidden font-mono text-xs text-[color:var(--text-muted)] sm:block">{features.length} capabilities</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-px border border-obsidian-border bg-obsidian-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const tagEntry = tagStyles[f.tag] || tagStyles.core;
            const tagColor = (tagEntry as Record<string, string>).color;
            const tagBorder = (tagEntry as Record<string, string>).border;
            return (
              <div
                key={f.name}
                className="group relative flex h-full flex-col bg-obsidian-surface p-5 transition-colors hover:bg-obsidian-elevated"
              >
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono text-sm font-bold text-[color:var(--text-primary)]">{f.name}</h3>
                    <span className={`border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tagColor} ${tagBorder}`}>
                      {f.tag}
                    </span>
                  </div>
                  <p className="font-mono text-xs leading-relaxed text-[color:var(--text-secondary)]">{f.spec}</p>
                  <div className="mt-auto grid grid-cols-2 items-end gap-2">
                    <p className="font-mono text-lg font-bold text-gold tabular-nums">{f.metric}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)] text-right">{f.metricLabel}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="font-mono text-xs text-[color:var(--text-muted)]">
            All features included in Monthly and Lifetime plans.
          </p>
          <Link
            href="#pricing"
            className="inline-flex min-h-[36px] items-center gap-2 border border-obsidian-border px-4 py-2 font-mono text-xs text-[color:var(--text-secondary)] transition-colors hover:border-gold hover:text-gold"
          >
            View pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
