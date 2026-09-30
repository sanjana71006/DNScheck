import React from 'react';
import { SecurityScorecardView } from '../components/security/SecurityScorecardView.js';
import { FindingsList } from '../components/findings/FindingsList.js';
import { ScanResult } from '@dnscheck/shared';
import { ShieldAlert } from 'lucide-react';

interface FindingsPageProps {
  currentScan: ScanResult | null;
}

export const FindingsPage: React.FC<FindingsPageProps> = ({ currentScan }) => {
  if (!currentScan) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-600 dark:text-slate-400 shadow-sm transition-colors">
        <ShieldAlert className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-base font-semibold text-slate-900 dark:text-white">No Security & Misconfiguration Analysis Available</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Run a scan to analyze SPF, DMARC, MX, and dangling CNAME conditions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-1">Email & Record Security Scorecard</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
          Automated compliance and protocol validation for SPF (RFC 7208), DMARC (RFC 7489), and MX resolution
        </p>
        <SecurityScorecardView scorecard={currentScan.securityScorecard} />
      </div>

      <FindingsList findings={currentScan.findings} />
    </div>
  );
};
