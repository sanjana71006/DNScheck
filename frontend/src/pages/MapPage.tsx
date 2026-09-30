import React from 'react';
import { GlobalPropagationMap } from '../components/map/GlobalPropagationMap.js';
import { ScanResult } from '@dnscheck/shared';
import { Globe, MapPin, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface MapPageProps {
  currentScan: ScanResult | null;
}

export const MapPage: React.FC<MapPageProps> = ({ currentScan }) => {
  if (!currentScan) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-600 dark:text-slate-400 shadow-sm transition-colors">
        <Globe className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-base font-semibold text-slate-900 dark:text-white">No Active DNS Scan Data</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Run a DNS scan from the Dashboard or Scanner tab to visualize global resolver vantage point convergence.
        </p>
      </div>
    );
  }

  const matchingCount = currentScan.resolverResults.filter((r) => r.matchesCanonical).length;
  const mismatchCount = currentScan.resolverResults.filter((r) => !r.matchesCanonical && r.status === 'SUCCESS').length;
  const failedCount = currentScan.resolverResults.filter((r) => r.status === 'TIMEOUT' || r.status === 'SERVFAIL' || r.status === 'ERROR').length;
  const avgLatency = Math.round(
    currentScan.resolverResults.reduce((acc, r) => acc + (r.responseTimeMs || 0), 0) /
      Math.max(currentScan.resolverResults.length, 1)
  );

  // Dynamically resolve canonical answer for the primary record type queried
  const primaryType =
    currentScan.resolverResults?.[0]?.recordType ||
    currentScan.recordTypes?.[0] ||
    (Object.keys(currentScan.recordPropagation || {})[0] as string) ||
    'A';

  const activePropagation =
    currentScan.recordPropagation?.[primaryType] ||
    Object.values(currentScan.recordPropagation || {})[0];

  const canonicalAnswer =
    activePropagation?.canonicalValue ||
    currentScan.records?.find((r) => r.type === primaryType)?.values ||
    [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3 transition-colors">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Converged</p>
            <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">{matchingCount} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">/ {currentScan.resolverResults.length}</span></p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3 transition-colors">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Different Response</p>
            <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">{mismatchCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3 transition-colors">
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Query Failures</p>
            <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">{failedCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3 transition-colors">
          <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Mean Latency</p>
            <p className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">{avgLatency} ms</p>
          </div>
        </div>
      </div>

      {/* Global Interactive Map */}
      <GlobalPropagationMap
        resolverResults={currentScan.resolverResults}
        canonicalAnswer={canonicalAnswer}
        authoritativeSummary={currentScan.authoritativeSummary}
        isDemo={currentScan.isDemo}
      />
    </div>
  );
};
