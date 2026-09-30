import React from 'react';
import { X, Server, Globe, Clock, CheckCircle2, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';
import { ResolverQueryResult } from '@dnscheck/shared';

interface ResolverDetailModalProps {
  result: ResolverQueryResult | null;
  canonicalAnswer?: string[];
  onClose: () => void;
}

export const ResolverDetailModal: React.FC<ResolverDetailModalProps> = ({
  result,
  canonicalAnswer = [],
  onClose
}) => {
  if (!result) return null;

  const isMatch = result.matchesCanonical;
  const isFailed = result.status === 'TIMEOUT' || result.status === 'SERVFAIL' || result.status === 'ERROR';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1322] border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-3 h-3 rounded-full ${
                isMatch ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-amber-500'
              }`}
            />
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{result.provider}</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-transparent font-mono">
              {result.resolverIp}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Location & Metadata */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <div>
              <p className="text-slate-500 dark:text-slate-400">Vantage Location</p>
              <p className="text-slate-900 dark:text-slate-100 font-medium mt-0.5">{result.locationLabel}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Continent / Country</p>
              <p className="text-slate-900 dark:text-slate-100 font-medium mt-0.5">
                {result.continent} • {result.country}
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Query Latency</p>
              <p className="text-slate-900 dark:text-slate-100 font-mono font-medium mt-0.5">{result.responseTimeMs} ms</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">TTL Reported</p>
              <p className="text-slate-900 dark:text-slate-100 font-mono font-medium mt-0.5">{result.ttl ? `${result.ttl}s` : 'N/A'}</p>
            </div>
          </div>

          {/* Status Verdict Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
              isMatch
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300'
                : isFailed
                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300'
                : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300'
            }`}
          >
            {isMatch ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : isFailed ? (
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {isMatch ? 'Status: MATCH (CONVERGED)' : isFailed ? `Status: ${result.status}` : 'Status: MISMATCH (STALE)'}
              </p>
              <p className="text-[11px] mt-0.5 text-slate-600 dark:text-slate-300">
                {isMatch
                  ? 'This vantage point resolver returns the exact canonical authoritative DNS answer.'
                  : isFailed
                  ? `Resolver failed to reply within timeout: ${result.error || 'Server failure'}`
                  : 'Resolver returns a stale or conflicting answer that does not match the authoritative record.'}
              </p>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="space-y-2">
            <div>
              <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">Expected Authoritative Value</p>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-emerald-700 dark:bg-slate-950 dark:border-slate-800 dark:text-emerald-400 break-all">
                {canonicalAnswer.length > 0 ? canonicalAnswer.join(', ') : '(Empty / None)'}
              </div>
            </div>

            <div>
              <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">Observed Resolver Answer</p>
              <div
                className={`p-2.5 rounded-lg border font-mono break-all ${
                  isMatch
                    ? 'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200'
                    : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-slate-950 dark:border-amber-700/50 dark:text-amber-300'
                }`}
              >
                {result.answers && result.answers.length > 0 ? result.answers.join(', ') : '(No answers returned)'}
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 text-right">
            Vantage query logged at: {new Date(result.checkedAt).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};
