'use client';

import { useState, useEffect } from 'react';
import { FeatureGate } from '@/app/dashboard/components/FeatureGate';

type Settings = {
  slippage: string;
  paperTrading: boolean;
  apiKeyMasked?: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    slippage: '0.5',
    paperTrading: false,
  });
  const [copied, setCopied] = useState(false);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const copyApiKey = async () => {
    try {
      const response = await fetch('/api/settings/api-key');
      if (!response.ok) {
        throw new Error('Failed to fetch API key');
      }
      const data = await response.json();
      if (data.apiKey) {
        await navigator.clipboard.writeText(data.apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy API key:', error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings/api-key')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load API key');
        return response.json();
      })
      .then((data) => {
        if (!cancelled && data.apiKeyMasked) {
          update({ apiKeyMasked: data.apiKeyMasked });
        }
      })
      .catch((error) => console.error('Failed to load API key:', error));

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-tight text-[color:var(--text-primary)]">Settings</h1>
        <p className="mt-1 font-mono text-xs text-[color:var(--text-secondary)]">
          API keys, execution defaults, and risk preferences.
        </p>
      </div>

      <div className="divide-y divide-obsidian-border/60">
        <div className="px-4 py-4">
          <p className="font-mono text-xs font-bold text-[color:var(--text-primary)]">API key</p>
          <p className="mt-1 font-mono text-xs text-[color:var(--text-secondary)]">
            Use this key for programmatic access. Keep it secret.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-sm border border-obsidian-border bg-obsidian-elevated px-3 py-2 font-mono text-xs text-[color:var(--text-secondary)]">
              {settings.apiKeyMasked ?? 'osiri...****'}
            </code>
            <FeatureGate requiredTier="monthly">
              <button
                type="button"
                onClick={copyApiKey}
                className="inline-flex min-h-[36px] items-center gap-2 border border-obsidian-border px-3 font-mono text-xs text-[color:var(--text-secondary)] transition-colors hover:border-gold hover:text-gold"
              >
                {copied ? 'copied' : 'copy'}
              </button>
            </FeatureGate>
            <FeatureGate requiredTier="monthly">
              <button
                type="button"
                className="inline-flex min-h-[36px] items-center gap-2 border border-obsidian-border px-3 font-mono text-xs text-[color:var(--text-secondary)] transition-colors hover:border-error hover:text-error"
              >
                regenerate
              </button>
            </FeatureGate>
          </div>
        </div>

        <div className="px-4 py-4">
          <p className="font-mono text-xs font-bold text-[color:var(--text-primary)]">Slippage tolerance</p>
          <p className="mt-1 font-mono text-xs text-[color:var(--text-secondary)]">
            Default cap before orders are cancelled and retried.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <FeatureGate requiredTier="monthly">
              <input
                type="text"
                value={settings.slippage}
                onChange={(event) => update({ slippage: event.target.value })}
                className="w-24 rounded-sm border border-obsidian-border bg-obsidian-elevated px-3 py-2 font-mono text-xs text-[color:var(--text-primary)] outline-none focus:border-gold"
              />
            </FeatureGate>
            <span className="font-mono text-xs text-[color:var(--text-muted)]">%</span>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs font-bold text-[color:var(--text-primary)]">Paper trading</p>
              <p className="mt-1 font-mono text-xs text-[color:var(--text-secondary)]">
                Simulate orders without executing on-chain.
              </p>
            </div>
            <FeatureGate requiredTier="monthly">
              <button
                type="button"
                onClick={() => update({ paperTrading: !settings.paperTrading })}
                className={`inline-flex min-h-[36px] items-center gap-2 border px-3 font-mono text-xs transition-colors ${
                  settings.paperTrading
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-obsidian-border text-[color:var(--text-secondary)] hover:border-gold hover:text-gold'
                }`}
              >
                {settings.paperTrading ? 'enabled' : 'disabled'}
              </button>
            </FeatureGate>
          </div>
        </div>
      </div>

      <div className="px-4">
        <FeatureGate requiredTier="monthly">
          <button
            type="button"
            className="inline-flex min-h-[40px] items-center gap-2 bg-gold px-4 py-2 font-mono text-xs font-bold text-obsidian transition-colors hover:bg-gold-bright"
          >
            save settings
          </button>
        </FeatureGate>
      </div>
    </div>
  );
}
