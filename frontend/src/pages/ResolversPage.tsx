import React from 'react';
import { ResolverMatrix } from '../components/scan/ResolverMatrix.js';
import { ScanResult } from '@dnscheck/shared';
import { Server } from 'lucide-react';

interface ResolversPageProps {
  currentScan: ScanResult | null;
}

export const ResolversPage: React.FC<ResolversPageProps> = ({ currentScan }) => {
  if (!currentScan) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-600 dark:text-slate-400 shadow-sm">
        <Server className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-base font-semibold text-slate-900 dark:text-white">No Resolver Endpoint Data Available</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Run a scan to view the 14-endpoint resolver comparison matrix.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <ResolverMatrix
        results={currentScan.resolverResults}
        domain={currentScan.domain}
        authoritativeServer={currentScan.authoritativeSummary?.primaryNameserver}
        records={currentScan.records}
      />
    </div>
  );
};
