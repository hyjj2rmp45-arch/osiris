'use client';

export function NewsWidget() {
  const newsItems: string[] = [
    'Phase 9 UI widgets are now functional.',
    'All new dashboard widgets passed lint and are green.',
    'Added fees estimator to help plan expenses.',
    'Real-time security alerts coming soon.',
    'More widgets on the way.',
  ];

  return (
    <div className="space-y-2 p-4 bg-surface-elevated border border-border rounded-sm">
      <h3 className="text-sm font-medium text-primary mb-2">Live Feed</h3>
      <ul className="text-sm text-left">
        {newsItems.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="font-medium">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}