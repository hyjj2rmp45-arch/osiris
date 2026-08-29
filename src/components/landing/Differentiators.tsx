/**
 * Dense, terminal-style differentiators — hairline rows, not cards.
 * Long-green / short-red for PnL, mono for numbers, Inter for prose.
 */

const caps = [
  {
    metric: '<500ms',
    label: 'Execution speed',
    body: 'Priority fee optimization and multi-RPC failover route through Jupiter, Raydium, Orca and 17 more exchanges.',
  },
  {
    metric: '0',
    label: 'MEV attacks landed',
    body: 'Sandwich detection with automatic fallback to private routing paths before your order hits the mempool.',
  },
  {
    metric: '100%',
    label: 'Honeypots caught in testing',
    body: 'Pre-trade contract analysis flags malicious transfer functions, locked liquidity, and unrenounced ownership.',
  },
];

export default function Differentiators() {
  return (
    <section className="border-t border-obsidian-border bg-obsidian-light" aria-labelledby="diff-heading">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <h2 id="diff-heading" className="font-mono text-xl font-bold tracking-tight text-[color:var(--text-primary)]">
          Why this terminal
        </h2>

        <div className="mt-8 divide-y divide-obsidian-border rounded-sm border border-obsidian-border overflow-hidden">
          {caps.map((c) => (
            <article key={c.label} className="grid grid-cols-1 gap-4 bg-obsidian-surface px-5 py-5 sm:grid-cols-[140px_1fr] sm:gap-6">
              <div className="flex items-start gap-3">
                <span className="font-mono text-2xl font-bold text-gold leading-none">{c.metric}</span>
              </div>
              <div>
                <h3 className="font-mono text-sm font-bold text-[color:var(--text-primary)]">{c.label}</h3>
                <p className="mt-1 font-mono text-xs leading-relaxed text-[color:var(--text-secondary)] max-w-[56ch]">{c.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
