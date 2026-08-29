'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

const EASE = [0.4, 0, 0.2, 1] as const;

/** Staggered fade-in-up wrapper for dashboard metric cards. */
export default function MetricCard({
  label,
  value,
  delta,
  positive,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  positive?: boolean;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className="rounded-sm border border-obsidian-border bg-obsidian-elevated p-6"
    >
      <p className="font-mono text-[11px] uppercase tracking-wider text-[color:var(--text-muted)]">{label}</p>
      <p className="mt-2 font-mono text-2xl text-[color:var(--text-primary)]">{value}</p>
      {delta && (
        <p
          className={`mt-1 font-mono text-xs ${
            positive ? 'text-success' : 'text-error'
          }`}
        >
          {delta}
        </p>
      )}
    </motion.article>
  );
}
