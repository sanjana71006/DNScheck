import React from 'react';
import { RecordTable } from '../components/scan/RecordTable.js';
import { ScanResult } from '@dnscheck/shared';
import { Layers } from 'lucide-react';

interface RecordsPageProps {
  currentScan: ScanResult | null;
}

export const RecordsPage: React.FC<RecordsPageProps> = ({ currentScan }) => {
  if (!currentScan) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-600 dark:text-slate-400 shadow-sm">
        <Layers className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-base font-semibold text-slate-900 dark:text-white">No DNS Records Available</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Run a scan to query and discover authoritative DNS records.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <RecordTable records={currentScan.records} resolverResults={currentScan.resolverResults} />
    </div>
  );
};
