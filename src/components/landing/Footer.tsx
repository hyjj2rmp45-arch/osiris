import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-obsidian-border bg-obsidian-light">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono font-bold text-gold">OSIRIS</p>
          <p className="mt-1 font-mono text-[11px] text-[color:var(--text-muted)]">
            &copy; {new Date().getFullYear()} OSIRIS. Trading involves risk of loss. SOL pricing approximate.
          </p>
        </div>
        <nav aria-label="Footer" className="flex items-center gap-2">
          <Link href="#features" className="font-mono text-xs text-[color:var(--text-secondary)] transition-colors hover:text-gold-pale">Features</Link>
          <Link href="#pricing" className="font-mono text-xs text-[color:var(--text-secondary)] transition-colors hover:text-gold-pale">Pricing</Link>
          <Link href="/dashboard" className="font-mono text-sm text-[color:var(--text-secondary)] transition-colors hover:text-gold-pale">Terminal</Link>
        </nav>
      </div>
    </footer>
  );
}
