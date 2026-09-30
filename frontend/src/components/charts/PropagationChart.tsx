import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import { RecordPropagationSummary } from '@dnscheck/shared';

interface PropagationChartProps {
  propagation: RecordPropagationSummary;
}

export const PropagationChart: React.FC<PropagationChartProps> = ({ propagation }) => {
  if (!propagation) return null;

  const data = [
    { name: 'Matching (Converged)', value: propagation.matchingResolvers, color: '#10b981' },
    { name: 'Different Response', value: propagation.mismatchingResolvers, color: '#f59e0b' },
    { name: 'Failure / Timeout', value: propagation.failingResolvers, color: '#ef4444' }
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md dark:shadow-xl flex flex-col items-center transition-colors">
      <div className="w-full flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Endpoint Consensus Distribution</h4>
        <span className="text-xs font-mono text-sky-700 dark:text-sky-400 font-bold">{propagation.propagationPercentage}%</span>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 self-start mb-4">
        Breakdown of {propagation.totalResolvers} global resolver responses
      </p>

      <div className="w-full h-48 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#090d16" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{propagation.propagationPercentage}%</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Converged</span>
        </div>
      </div>

      <div className="w-full grid grid-cols-3 gap-2 mt-4 text-center text-xs">
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-slate-600 dark:text-slate-400 text-[10px] font-medium">Matching</p>
          <p className="text-emerald-700 dark:text-emerald-400 font-bold font-mono text-sm">{propagation.matchingResolvers}</p>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-slate-600 dark:text-slate-400 text-[10px] font-medium">Different</p>
          <p className="text-amber-800 dark:text-amber-400 font-bold font-mono text-sm">{propagation.mismatchingResolvers}</p>
        </div>
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-slate-600 dark:text-slate-400 text-[10px] font-medium">Timeout</p>
          <p className="text-rose-700 dark:text-rose-400 font-bold font-mono text-sm">{propagation.failingResolvers}</p>
        </div>
      </div>
    </div>
  );
};
