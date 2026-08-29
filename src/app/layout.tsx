import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OSIRIS — Solana trading terminal',
  description:
    'Sub-500ms routing, MEV protection, honeypot screening, copy trading, and a hard circuit breaker. Built for Solana traders.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${body.variable} ${mono.variable}`}>
      <body className="bg-obsidian font-body text-[color:var(--text-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
