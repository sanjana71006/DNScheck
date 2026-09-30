import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Layers, Server, FileText } from 'lucide-react';
import { ScanResult, ResolverQueryResult } from '@dnscheck/shared';
import { ResolverDetailModal } from '../map/ResolverDetailModal.js';

interface RecordTableProps {
  records: ScanResult['records'];
  resolverResults: ResolverQueryResult[];
  domain?: string;
  authoritativeServer?: string;
}

export const RecordTable: React.FC<RecordTableProps> = ({
  records,
  resolverResults,
  domain = '',
  authoritativeServer = ''
}) => {
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [selectedResolver, setSelectedResolver] = useState<ResolverQueryResult | null>(null);

  if (!records || records.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-600 dark:text-slate-400 text-xs shadow-md">
        No active DNS records discovered for this query.
      </div>
    );
  }

  const toggleExpand = (type: string) => {
    setExpandedType(expandedType === type ? null : type);
  };

  const selectedCanonical = selectedResolver
    ? records.find((rec) => rec.type === selectedResolver.recordType)?.values ||
      selectedResolver.whyDifferent?.authoritativeAnswer ||
      []
    : [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md dark:shadow-xl transition-colors">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Authoritative & Discovered DNS Records</h3>
        </div>
        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Click a record row to expand resolver endpoint breakdown</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-950/80 text-slate-800 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4 w-10"></th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Hostname</th>
              <th className="py-3 px-4">Discovered / Canonical Value</th>
              <th className="py-3 px-4">TTL</th>
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4">Convergence</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
            {records.map((rec) => {
              const isExpanded = expandedType === rec.type;
              const matchingVantages = resolverResults.filter(
                (r) => r.recordType === rec.type || (rec.type === 'A' && r.recordType === 'A')
              );

              return (
                <React.Fragment key={rec.type}>
                  <tr
                    onClick={() => toggleExpand(rec.type)}
                    className="hover:bg-sky-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-400 dark:text-slate-500">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-sky-600 dark:text-sky-400" /> : <ChevronRight className="w-4 h-4" />}
                    </td>
                    <td className="py-3 px-4 font-bold">
                      <span className="px-2.5 py-1 rounded font-mono text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800/50 shadow-xs">
                        {rec.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-300 font-mono text-[11px] font-medium truncate max-w-[140px]">
                      {rec.name}
                    </td>
                    <td className="py-3 px-4 text-slate-950 dark:text-slate-100 font-mono text-[11px] font-semibold">
                      <div className="flex flex-col space-y-1">
                        {rec.values.map((v, i) => (
                          <span key={i} className="break-all">{v}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-400 font-mono font-medium">{rec.ttl ?? '300'}s</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wide border shadow-xs ${
                          rec.source === 'authoritative'
                            ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/50'
                            : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-transparent'
                        }`}
                      >
                        {rec.source === 'authoritative' ? 'Authoritative' : 'Consensus'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-950 dark:text-slate-100">
                      {rec.propagationPercentage}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      {rec.status === 'MATCH' ? (
                        <span className="inline-flex items-center space-x-1.5 text-emerald-800 bg-emerald-100 border border-emerald-300 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30 px-2.5 py-1 rounded text-[11px] font-bold shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>PASS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 text-amber-900 bg-amber-100 border border-amber-300 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30 px-2.5 py-1 rounded text-[11px] font-bold shadow-xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>DIFFERENT</span>
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Resolver Details */}
                  {isExpanded && (
                    <tr className="bg-slate-50 dark:bg-slate-950/70">
                      <td colSpan={8} className="p-4 border-b border-slate-200 dark:border-slate-800/80">
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950/50 shadow-sm">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white mb-2 flex items-center space-x-1.5">
                            <Server className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                            <span>Resolver Responses for {rec.type} Record</span>
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {matchingVantages.map((v) => (
                              <div
                                key={v.resolverId}
                                onClick={() => setSelectedResolver(v)}
                                className={`p-2.5 rounded-lg border text-xs flex items-start justify-between shadow-xs cursor-pointer hover:border-sky-400 dark:hover:border-sky-500 transition-colors ${
                                  v.matchesCanonical
                                    ? 'bg-slate-50 border-slate-200 dark:bg-slate-900/60 dark:border-slate-800'
                                    : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-800/60 dark:text-amber-200'
                                }`}
                              >
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-slate-200">{v.provider}</p>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{v.locationLabel} • {v.resolverIp}</p>
                                  <p className="font-mono text-[11px] text-sky-700 dark:text-sky-400 mt-1 truncate max-w-[180px] font-semibold">
                                    {v.answers.join(', ') || '(Empty)'}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end space-y-1.5">
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                                      v.matchesCanonical
                                        ? 'text-emerald-800 bg-emerald-100 border-emerald-300 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30'
                                        : 'text-amber-900 bg-amber-100 border-amber-300 dark:text-amber-300 dark:bg-amber-500/20 dark:border-amber-500/40'
                                    }`}
                                  >
                                    {v.matchesCanonical ? 'MATCH' : 'DIFFERENT'}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedResolver(v);
                                    }}
                                    className="text-[10px] font-sans text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 flex items-center space-x-1"
                                    title="View Evidence Telemetry"
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>Evidence</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedResolver && (
        <ResolverDetailModal
          result={selectedResolver}
          canonicalAnswer={selectedCanonical}
          domain={domain}
          authoritativeServer={authoritativeServer}
          onClose={() => setSelectedResolver(null)}
        />
      )}
    </div>
  );
};
