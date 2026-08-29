import type { ReactNode } from 'react';

/** Reusable gold gradient text wrapper. */
export default function GoldGradient({ children }: { children: ReactNode }) {
  return <span className="gold-gradient-text">{children}</span>;
}
