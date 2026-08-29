'use client';
import { useState, useEffect } from 'react';

interface Alert { title: string; severity: 'info' | 'warning' | 'critical'; timestamp: string; description?: string; }

export function AdminAlertsWidget() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/alerts').then(r => r.json()).then(d => setAlerts(d.alerts ?? [])).catch(() => setError('Failed'));
  }, []);
  return (
    <div className="p-4 bg-surface-elevated border border-border rounded-sm">
      <h3 className="text-sm font-medium text-primary mb-2">Security Alerts</h3>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {alerts.length === 0 ? <p className="text-sm text-muted">No active alerts.</p> : (
        <ul className="space-y-2 max-h-48 overflow-y-auto text-sm">
          {alerts.map((a, i) => (
            <li key={i} className="flex items-start gap-2"><span className="font-medium">{a.title}</span><span className="text-xs text-muted">{String(new Date(a.timestamp).getHours()).padStart(2,'0')}:{String(new Date(a.timestamp).getMinutes()).padStart(2,'0')}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}
