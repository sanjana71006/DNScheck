import React from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Download,
  Printer,
  Shield,
  Server,
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
import { ScanResult } from '@dnscheck/shared';
import { exportScanAsJson, exportScanAsCsv, printScanReport } from '../../utils/export.js';

interface OverallStatusCardProps {
  scan: ScanResult;
}

export const OverallStatusCard: React.FC<OverallStatusCardProps> = ({ scan }) => {
  const getStatusBadge = () => {
    switch (scan.overallStatus) {
      case 'HEALTHY':
        return {
          label: 'CONVERGED & HEALTHY',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-300',
          icon: CheckCircle
        };
      case 'PROPAGATING':
        return {
          label: 'PROPAGATION IN PROGRESS',
          bg: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-300',
          icon: RefreshCw
        };
      case 'WARNING':
        return {
          label: 'MISCONFIGURATIONS DETECTED',
          bg: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-300',
          icon: AlertTriangle
        };
      case 'ERROR':
      default:
        return {
          label: 'ATTENTION REQUIRED / ADVISORIES',
          bg: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-300',
          icon: AlertTriangle
        };
    }
  };

  const status = getStatusBadge();
  const StatusIcon = status.icon;

  const authNsCount = scan.authoritativeSummary?.nameservers?.length || 0;
  const serialConsistent = scan.authoritativeSummary?.soaSerialsConsistent;
  const dominantSerial = scan.authoritativeSummary?.dominantSerial;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-md dark:shadow-xl transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h2 className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 dark:text-white tracking-tight">{scan.domain}</h2>
            <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-bold shadow-xs ${status.bg}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{status.label}</span>
            </div>
            {scan.isDemo && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 shadow-xs">
                DEMO DATA
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Scan completed in <span className="font-mono text-slate-900 dark:text-slate-200 font-bold">{scan.durationMs}ms</span> • Checked at{' '}
            <span className="font-mono text-slate-900 dark:text-slate-200 font-medium">{new Date(scan.completedAt).toLocaleString()}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportScanAsJson(scan)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold dark:text-slate-200 border dark:border-slate-700 transition-colors shadow-xs"
            title="Download JSON Report"
          >
            <FileCode className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>JSON</span>
          </button>
          <button
            onClick={() => exportScanAsCsv(scan)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold dark:text-slate-200 border dark:border-slate-700 transition-colors shadow-xs"
            title="Download CSV Report"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>CSV</span>
          </button>
          <button
            onClick={printScanReport}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold dark:text-slate-200 border dark:border-slate-700 transition-colors shadow-xs"
            title="Print Report"
          >
            <Printer className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
        {/* Metric 1: Propagation Percentage */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 shadow-xs">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Global Propagation</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-950 dark:text-white">
              {scan.propagationPercentage}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">converged</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${
                scan.propagationPercentage >= 90
                  ? 'bg-emerald-500'
                  : scan.propagationPercentage >= 60
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${scan.propagationPercentage}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Resolver Vantage Agreement */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 shadow-xs">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Resolver Consensus</p>
          <div className="flex items-baseline space-x-1 font-mono">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-white">{scan.resolverAgreement}</span>
            <span className="text-slate-500 dark:text-slate-400 text-lg font-medium">/ {scan.totalResolversQueried}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Global vantages report expected answer</p>
        </div>

        {/* Metric 3: Authoritative Nameservers */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Authoritative NS</p>
            <Server className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-950 dark:text-white">
            {authNsCount}
          </div>
          <div className="flex items-center space-x-1.5 text-xs mt-2 truncate">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                serialConsistent ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px] truncate font-medium">
              {dominantSerial ? `SOA: ${dominantSerial}` : 'No SOA detected'}
            </span>
          </div>
        </div>

        {/* Metric 4: Security Scorecard Status */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Findings & Security</p>
            <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-950 dark:text-white">
            {scan.findings.length}
          </div>
          <div className="flex items-center space-x-2 text-[11px] mt-2 text-slate-500 dark:text-slate-400">
            <span className="text-rose-700 dark:text-rose-400 font-bold">
              {scan.findings.filter((f) => f.severity === 'CRITICAL').length} Critical
            </span>
            <span>•</span>
            <span className="text-amber-800 dark:text-amber-400 font-bold">
              {scan.findings.filter((f) => f.severity === 'WARNING').length} Warn
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
