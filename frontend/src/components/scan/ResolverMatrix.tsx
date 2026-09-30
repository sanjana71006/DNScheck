import React, { useState } from 'react';
import { Server, ArrowUpDown, CheckCircle, AlertTriangle, XCircle, Search } from 'lucide-react';
import { ResolverQueryResult } from '@dnscheck/shared';

interface ResolverMatrixProps {
  results: ResolverQueryResult[];
}

export const ResolverMatrix: React.FC<ResolverMatrixProps> = ({ results }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'provider' | 'responseTimeMs' | 'status'>('responseTimeMs');
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = results
    .filter(
      (r) =>
        r.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.resolverIp.includes(searchTerm) ||
        r.locationLabel.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'responseTimeMs') {
        comparison = a.responseTimeMs - b.responseTimeMs;
      } else if (sortField === 'provider') {
        comparison = a.provider.localeCompare(b.provider);
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortAsc ? comparison : -comparison;
    });

  const toggleSort = (field: 'provider' | 'responseTimeMs' | 'status') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md dark:shadow-xl transition-colors">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Resolver Vantage Comparison Matrix</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            14 global recursive resolver points observing live response convergence
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter vantage points..."
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans shadow-xs"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-950/80 text-slate-800 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4 cursor-pointer hover:text-sky-600 dark:hover:text-white" onClick={() => toggleSort('provider')}>
                <div className="flex items-center space-x-1">
                  <span>Provider & Vantage</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">Resolver IP</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Record Type</th>
              <th className="py-3 px-4 cursor-pointer hover:text-sky-600 dark:hover:text-white" onClick={() => toggleSort('responseTimeMs')}>
                <div className="flex items-center space-x-1">
                  <span>Latency</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">Observed DNS Answer</th>
              <th className="py-3 px-4 text-right cursor-pointer hover:text-sky-600 dark:hover:text-white" onClick={() => toggleSort('status')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
            {filtered.map((res) => {
              const isMatch = res.matchesCanonical;
              const isFail = res.status === 'TIMEOUT' || res.status === 'SERVFAIL' || res.status === 'ERROR';

              return (
                <tr key={res.resolverId} className="hover:bg-sky-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200">
                    {res.provider}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 font-medium">{res.resolverIp}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-sans text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{res.locationLabel}</span>{' '}
                    <span className="text-slate-500 font-normal">
                      {res.networkType === 'anycast' ? '(Anycast Edge)' : `(${res.continent})`}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-sky-100 text-sky-800 border border-sky-300 dark:bg-slate-800 dark:text-sky-400 dark:border-transparent shadow-xs">
                      {res.recordType}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span
                      className={`font-semibold ${
                        res.responseTimeMs < 50
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : res.responseTimeMs < 150
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {res.responseTimeMs} ms
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] max-w-xs truncate">
                    {res.answers && res.answers.length > 0 ? (
                      <span className={isMatch ? 'text-slate-900 dark:text-slate-300 font-medium' : 'text-amber-800 dark:text-amber-300 font-bold'}>
                        {res.answers.join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">No answers</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isMatch ? (
                      <span className="inline-flex items-center space-x-1.5 font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30 px-2.5 py-1 rounded text-[11px] shadow-xs">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>MATCH</span>
                      </span>
                    ) : isFail ? (
                      <span className="inline-flex items-center space-x-1.5 font-bold text-rose-800 bg-rose-100 border border-rose-300 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/30 px-2.5 py-1 rounded text-[11px] shadow-xs">
                        <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        <span>{res.status}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 font-bold text-amber-900 bg-amber-100 border border-amber-300 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30 px-2.5 py-1 rounded text-[11px] shadow-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>DIFFERENT</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
