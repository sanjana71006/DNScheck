import React from 'react';
import { X, Server, Globe, Clock, CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Activity, Database, Info } from 'lucide-react';
import { ResolverQueryResult } from '@dnscheck/shared';

interface ResolverDetailModalProps {
  result: ResolverQueryResult | null;
  canonicalAnswer?: string[];
  domain?: string;
  authoritativeServer?: string;
  onClose: () => void;
}

export const ResolverDetailModal: React.FC<ResolverDetailModalProps> = ({
  result,
  canonicalAnswer = [],
  domain = '',
  authoritativeServer = '',
  onClose
}) => {
  if (!result) return null;

  const isMatch = result.matchesCanonical;
  const isFailed =
    result.status === 'TIMEOUT' ||
    result.status === 'SERVFAIL' ||
    result.status === 'ERROR' ||
    result.status === 'REFUSED';

  const summaryLabel = result.whyDifferent?.summaryLabel || (isMatch ? 'Exact match' : isFailed ? 'Resolver query failed' : 'Distinct answer set');

  const aaBit = result.flags?.aa ? '1 (Authoritative)' : '0 (Non-authoritative)';
  const rdBit = result.flags?.rd !== undefined ? (result.flags.rd ? '1 (Recursion Desired)' : '0') : '1 (Default)';
  const raBit = result.flags?.ra !== undefined ? (result.flags.ra ? '1 (Recursion Available)' : '0') : '1 (Default)';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0d1322] border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                isMatch ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-amber-500'
              }`}
            />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {result.provider}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-transparent font-mono">
                  {result.resolverIp}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800/50">
                  {result.recordType}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                DNS Audit & Evidence Inspection Panel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* Status Verdict Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start space-x-3 ${
              isMatch
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300'
                : isFailed
                ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300'
                : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300'
            }`}
          >
            {isMatch ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : isFailed ? (
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm">
                  {isMatch ? 'Status: MATCH (CONVERGED)' : isFailed ? `Status: ${result.status}` : 'Status: DIFFERENT RESPONSE'}
                </p>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-white/70 dark:bg-black/40 border border-current">
                  {summaryLabel}
                </span>
              </div>
              <p className="text-[11px] mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                {isMatch
                  ? 'Observed answer set matches authoritative record set exactly (order-independent set equality).'
                  : isFailed
                  ? `Resolver query failed: ${result.error || result.status}`
                  : result.whyDifferent?.possibleCauses?.[0] ||
                    'Resolver returned a distinct response from the authoritative reference.'}
              </p>
              {result.whyDifferent?.possibleCauses && result.whyDifferent.possibleCauses.length > 1 && (
                <ul className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-400 list-disc list-inside">
                  {result.whyDifferent.possibleCauses.slice(1).map((cause, idx) => (
                    <li key={idx}>{cause}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Authoritative Answer Set</span>
                <span className="text-[10px] text-purple-700 dark:text-purple-400 font-bold uppercase">Port 53 Direct</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 min-h-[42px] break-all">
                {canonicalAnswer.length > 0 ? canonicalAnswer.join(', ') : '(Empty / Reference Unavailable)'}
              </div>
              {authoritativeServer && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 truncate">
                  Authoritative NS: <span className="font-mono text-slate-700 dark:text-slate-300">{authoritativeServer}</span>
                </p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Resolver Observed Answer Set</span>
                <span className="text-[10px] text-sky-700 dark:text-sky-400 font-mono font-bold">{result.provider}</span>
              </div>
              <div
                className={`p-2.5 rounded-lg border font-mono text-[11px] min-h-[42px] break-all ${
                  isMatch
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200'
                    : 'bg-amber-50/50 dark:bg-slate-900 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-300 font-semibold'
                }`}
              >
                {result.answers && result.answers.length > 0 ? result.answers.join(', ') : '(No answers returned)'}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                Observed via: <span className="font-mono text-slate-700 dark:text-slate-300">{result.resolverIp}</span>
              </p>
            </div>
          </div>

          {/* 15 Audit Evidence Fields Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950/40">
            <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70 font-semibold text-slate-800 dark:text-slate-200 text-[11px] flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>RFC 1035 / DoH Audit Evidence Telemetry</span>
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                result.evidenceTag === 'DEMO_DATA'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}>
                {result.evidenceTag === 'DEMO_DATA' ? 'DEMO DATA / SIMULATED' : 'LIVE DNS QUERY'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 p-3.5 text-[11px]">
              {domain && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Domain</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold truncate block">{domain}</span>
                </div>
              )}
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Record Type</span>
                <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold">{result.recordType}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Endpoint Type</span>
                <span className="text-slate-900 dark:text-slate-100 font-medium">
                  {result.networkType === 'anycast' ? 'Global Anycast' : 'Unicast Resolver'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Resolver Region</span>
                <span className="text-slate-900 dark:text-slate-100 font-medium">{result.locationLabel}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Transport</span>
                <span className="font-mono text-slate-900 dark:text-slate-100 font-medium">
                  {result.transport || 'UDP'} {result.transport === 'DOH' ? '(RFC 8484)' : '(RFC 1035)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Query Latency</span>
                <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold">{result.responseTimeMs} ms</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">TTL Remaining</span>
                <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold">
                  {result.ttl !== undefined ? `${result.ttl}s` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">RCODE</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{result.rcode || 'NOERROR'}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">AA Flag (Authoritative)</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{aaBit}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">RD Flag (Recursion Desired)</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{rdBit}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">RA Flag (Recursion Avail)</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{raBit}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Query Timestamp</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 text-[10px]">
                  {new Date(result.checkedAt).toISOString().split('T')[1].replace('Z', ' UTC')}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-slate-500 dark:text-slate-400 text-right font-mono">
            Evidence logged: {new Date(result.checkedAt).toISOString()}
          </div>
        </div>
      </div>
    </div>
  );
};
