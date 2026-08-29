'use client';

import { useState } from 'react';

interface CircuitBreakerConfig {
  maxDailyLoss: number;
  maxConsecutiveLosses: number;
  maxPositionSize: number;
  maxDailyTrades: number;
  autoPauseEnabled: boolean;
  pauseDurationMinutes: number;
  notifyOnTrigger: boolean;
}

const defaultConfig: CircuitBreakerConfig = {
  maxDailyLoss: 1000, // SOL
  maxConsecutiveLosses: 5,
  maxPositionSize: 5000, // SOL
  maxDailyTrades: 100,
  autoPauseEnabled: true,
  pauseDurationMinutes: 60,
  notifyOnTrigger: true,
};

export const CircuitBreakerConfig = () => {
  const [config, setConfig] = useState<CircuitBreakerConfig>(defaultConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (field: keyof CircuitBreakerConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In real app, call API to save circuit breaker config
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Saving circuit breaker config:', config);
      setSaved(true);
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset to default settings?')) {
      setConfig(defaultConfig);
      setSaved(false);
    }
  };

  return (
    <div className="p-6 bg-surface-elevated border border-border rounded-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Circuit Breaker Configuration</h2>
        <button
          onClick={handleReset}
          className="px-3 py-1 text-xs border border-border rounded hover:bg-surface"
        >
          Reset to Defaults
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wide">Loss Limits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Max Daily Loss (SOL)</label>
              <input
                type="number"
                value={config.maxDailyLoss}
                onChange={(e) => handleChange('maxDailyLoss', parseFloat(e.target.value))}
                min="0"
                step="10"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pause trading if daily loss exceeds this amount
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Consecutive Losses</label>
              <input
                type="number"
                value={config.maxConsecutiveLosses}
                onChange={(e) => handleChange('maxConsecutiveLosses', parseInt(e.target.value))}
                min="1"
                max="20"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pause after this many losing trades in a row
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wide">Position & Volume Limits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Max Position Size (SOL)</label>
              <input
                type="number"
                value={config.maxPositionSize}
                onChange={(e) => handleChange('maxPositionSize', parseFloat(e.target.value))}
                min="0"
                step="100"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum size for any single position
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Daily Trades</label>
              <input
                type="number"
                value={config.maxDailyTrades}
                onChange={(e) => handleChange('maxDailyTrades', parseInt(e.target.value))}
                min="1"
                max="1000"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum number of trades per 24 hours
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wide">Auto-Pause Behavior</h3>
          <div className="space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoPauseEnabled}
                onChange={(e) => handleChange('autoPauseEnabled', e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
              />
              <span className="text-sm">Enable automatic pause when limits are breached</span>
            </label>
            
            <div>
              <label className="block text-sm font-medium mb-2">Pause Duration (minutes)</label>
              <input
                type="number"
                value={config.pauseDurationMinutes}
                onChange={(e) => handleChange('pauseDurationMinutes', parseInt(e.target.value))}
                min="5"
                max="1440"
                className="w-full max-w-xs px-3 py-2 border border-border rounded-md bg-surface"
              />
              <p className="text-xs text-muted-foreground mt-1">
                How long to pause trading after a circuit breaker triggers
              </p>
            </div>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.notifyOnTrigger}
                onChange={(e) => handleChange('notifyOnTrigger', e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
              />
              <span className="text-sm">Send notification when circuit breaker triggers</span>
            </label>
          </div>
        </div>

        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-sm">
          <h3 className="font-medium text-blue-400 mb-2">How It Works</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Circuit breaker monitors all trading activity in real-time</li>
            <li>• When any limit is breached, new trades are blocked immediately</li>
            <li>• Existing positions are NOT automatically closed</li>
            <li>• Auto-pause can be overridden with Tier 3 re-authentication</li>
            <li>• Manual resume available in Sessions tab after pause duration</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-border">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-border rounded-md hover:bg-surface"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-primary text-surface rounded-md hover:bg-primary-dark disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : saved ? 'Saved!' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};