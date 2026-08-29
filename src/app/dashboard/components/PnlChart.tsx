'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const data = [
  { month: 'Jan', pnl: 0.42 },
  { month: 'Feb', pnl: 0.68 },
  { month: 'Mar', pnl: 0.51 },
  { month: 'Apr', pnl: 1.12 },
  { month: 'May', pnl: 0.87 },
  { month: 'Jun', pnl: -0.34 },
  { month: 'Jul', pnl: 1.45 },
  { month: 'Aug', pnl: 1.92 },
  { month: 'Sep', pnl: 1.31 },
  { month: 'Oct', pnl: 2.18 },
  { month: 'Nov', pnl: 1.74 },
  { month: 'Dec', pnl: 2.41 },
];

export default function PnlChart() {
  return (
    <section
      aria-label="12-month PNL chart"
      className="rounded-sm border border-obsidian-border bg-obsidian-elevated p-6"
    >
      <h3 className="font-medium">PNL, Last 12 Months (SOL)</h3>
      <div className="mt-6 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="month"
              tick={{ fill: '#5A5560', fontSize: 11 }}
              axisLine={{ stroke: '#1E1E2A' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#5A5560', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(212,175,55,0.06)' }}
              contentStyle={{
                background: '#14141C',
                border: '1px solid #1E1E2A',
                borderRadius: 12,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
              }}
              labelStyle={{ color: '#A09B8C' }}
              itemStyle={{ color: '#F0EDE5' }}
            />
            <Bar
              dataKey="pnl"
              radius={[3, 3, 0, 0]}
              fill="#D4AF37"
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
