/**
 * How it works: three dense steps with mono step markers, no cards.
 */
const steps = [
  {
    n: '01',
    verb: 'Connect',
    body: 'Phantom, Solflare, or Backpack. OSIRIS signs transactions only. Your seed phrase never leaves your device.',
  },
  {
    n: '02',
    verb: 'Configure',
    body: 'Copy targets, risk limits, session budgets, circuit breaker thresholds. Set your tolerance once.',
  },
  {
    n: '03',
    verb: 'Trade',
    body: 'Execute manually or run sessions. MEV routing, honeypot filters, and loss limits stay on.',
  },
];

export default function HowItWorks() {
  return (
    <section className="border-t border-obsidian-border py-16" aria-labelledby="how-heading">
      <div className="mx-auto max-w-[1200px] px-6">
        <h2 id="how-heading" className="font-mono text-xl font-bold tracking-tight text-[color:var(--text-primary)]">
          Running in under five minutes
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-obsidian-border bg-obsidian-border md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="bg-obsidian-surface p-6">
              <p className="font-mono text-xs text-gold">{s.n}</p>
              <h3 className="mt-3 font-mono text-sm font-bold text-[color:var(--text-primary)]">{s.verb}</h3>
              <p className="mt-2 font-mono text-xs leading-relaxed text-[color:var(--text-secondary)]">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
