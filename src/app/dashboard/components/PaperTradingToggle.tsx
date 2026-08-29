'use client';

import { useState } from 'react';

export default function PaperTradingToggle() {
  const [enabled, setEnabled] = useState(false);

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => setEnabled(e.target.checked)}
        className="sr-only peer"
      />
      <div className="relative h-5 w-9 bg-obsidian-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold rounded-full peer dark:bg-obsidian-border peer-checked:bg-gold/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-[color:var(--text-muted)] after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:bg-gold peer-checked:after:border-gold">
      </div>
      <span className="font-mono text-[11px] uppercase tracking-wider text-[color:var(--text-secondary)]">
        paper
      </span>
    </label>
  );
}
