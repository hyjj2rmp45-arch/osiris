'use client';

import Link from 'next/link';

const tiers = [
  {
    name: 'Monthly',
    priceLabel: '0.3',
    period: '/month',
    description: 'Live trading with full risk controls and priority execution.',
    cta: 'Start monthly plan',
    href: '/select-tier?tier=monthly', // Goes to payment flow
    featured: true,
    perks: ['Live trading', 'Full analytics', 'Priority support', '10 copy targets', 'MEV protection', 'Circuit breaker'],
    trust: 'Cancel anytime · No hidden fees',
  },
  {
    name: 'Lifetime',
    priceLabel: '1',
    period: 'once',
    description: 'One payment. Every feature, forever. No recurring fees.',
    cta: 'Unlock lifetime',
    href: '/select-tier?tier=lifetime',
    featured: false,
    perks: ['All Monthly features', 'API access', 'VIP support', '20 copy targets', 'Lifetime updates'],
    trust: 'Lifetime access · No recurring charges',
  },
];

function Check({ v, className = '' }: { v: boolean; className?: string }) {
  return v ? (
    <span className={`text-success ${className}`} aria-label="Included">✓</span>
  ) : (
    <span className={`text-[color:var(--text-muted)] ${className}`} aria-label="Not included">—</span>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="border-t border-obsidian-border py-16 sm:py-20 lg:py-24" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">pricing</p>
          <h2 id="pricing-heading" className="mt-1 font-mono text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[color:var(--text-primary)]">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 font-mono text-sm sm:text-base text-[color:var(--text-secondary)]">
            Pay in SOL. No hidden fees. SOL pricing is approximate and may fluctuate.
          </p>
        </div>

        <div className="mt-10 lg:mt-12 grid grid-cols-1 gap-px border border-obsidian-border bg-obsidian-border sm:grid-cols-2">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex h-full flex-col bg-obsidian-surface p-6 sm:p-8 ${tier.featured ? 'border-l-2 border-l-gold sm:border-l-0 sm:border-t-2 sm:border-t-gold' : ''}`}
            >
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 sm:left-auto sm:-top-0 sm:-right-3 sm:translate-x-0">
                  <span className="border border-gold bg-gold px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-obsidian">
                    Recommended
                  </span>
                </div>
              )}

              <div className="flex flex-1 flex-col">
                <div className="text-center">
                  <h3 className="font-mono text-lg sm:text-xl font-bold text-[color:var(--text-primary)]">{tier.name}</h3>
                  <div className="mt-4 flex items-baseline justify-center gap-2">
                    <img src="/solana-logo.svg" alt="SOL" className="h-6 w-6" />
                    <span className="font-mono text-3xl sm:text-4xl font-bold text-gold">{tier.priceLabel}</span>
                    {tier.period && (
                      <span className="font-mono text-sm sm:text-base text-[color:var(--text-muted)]">{tier.period}</span>
                    )}
                  </div>
                  <p className="mt-4 font-mono text-xs sm:text-sm leading-relaxed text-[color:var(--text-secondary)]">
                    {tier.description}
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-3 font-mono text-xs sm:text-sm text-[color:var(--text-secondary)]">
                      <Check v={true} className="mt-0.5 flex-shrink-0" />
                      {perk}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-6">
                  <Link
                    href={tier.href}
                    className={`inline-flex w-full min-h-[44px] items-center justify-center gap-2 border px-5 py-2.5 font-mono text-sm font-bold transition-all ${
                      tier.featured
                        ? 'border-gold bg-gold text-obsidian hover:bg-gold-bright hover:shadow-[0_0_24px_rgba(212,175,55,0.3)]'
                        : 'border-obsidian-border text-[color:var(--text-secondary)] hover:border-gold hover:text-gold hover:bg-obsidian-elevated'
                    }`}
                  >
                    {tier.cta}
                  </Link>
                  <p className="mt-3 text-center font-mono text-[10px] text-[color:var(--text-muted)]">{tier.trust}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Payment note */}
        <p className="mt-10 text-center font-mono text-[10px] text-[color:var(--text-muted)]">
          Payments processed via Phantom wallet. Instant access upon confirmation.
        </p>
      </div>
    </section>
  );
}