import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { ResolverQueryResult } from '@dnscheck/shared';

interface LatencyChartProps {
  resolverResults: ResolverQueryResult[];
}

export const LatencyChart: React.FC<LatencyChartProps> = ({ resolverResults }) => {
  if (!resolverResults || resolverResults.length === 0) return null;

  const data = resolverResults
    .filter((r) => r.responseTimeMs > 0)
    .map((r) => ({
      name: `${r.provider.split(' ')[0]} (${r.locationLabel.split(' ')[0]})`,
      latency: r.responseTimeMs,
      status: r.status,
      isMatch: r.matchesCanonical
    }));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md dark:shadow-xl transition-colors">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Vantage Query Latency (ms)</h4>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Response time per resolver vantage point</span>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
        Lower latency indicates faster resolution closer to the observer edge
      </p>

      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={9}
              interval={0}
              angle={-25}
              textAnchor="end"
            />
            <YAxis stroke="#64748b" fontSize={10} unit="ms" />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="latency" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => {
                const color = !entry.isMatch ? '#f59e0b' : entry.latency > 150 ? '#ec4899' : '#38bdf8';
                return <Cell key={`bar-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
