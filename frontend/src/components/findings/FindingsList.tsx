import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronRight, Wrench, Shield } from 'lucide-react';
import { Finding, FindingSeverity } from '@dnscheck/shared';

interface FindingsListProps {
  findings: Finding[];
}

export const FindingsList: React.FC<FindingsListProps> = ({ findings }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filtered = findings.filter((f) => {
    if (filterSeverity === 'ALL') return true;
    return f.severity === filterSeverity;
  });

  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const warningCount = findings.filter((f) => f.severity === 'WARNING').length;
  const infoCount = findings.filter((f) => f.severity === 'INFO').length;

  if (findings.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center shadow-md dark:shadow-xl">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white">Zero Misconfigurations Detected</h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
          All DNS syntax, nameserver delegations, SPF/DMARC policies, and resolver propagation thresholds conform to standard RFC specifications.
        </p>
      </div>
    );
  }

  const getSeverityStyle = (sev: FindingSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          badge: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',
          border: 'border-l-rose-500',
          icon: AlertCircle,
          iconColor: 'text-rose-600 dark:text-rose-400'
        };
      case 'WARNING':
        return {
          badge: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
          border: 'border-l-amber-500',
          icon: AlertTriangle,
          iconColor: 'text-amber-600 dark:text-amber-400'
        };
      case 'INFO':
      default:
        return {
          badge: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40',
          border: 'border-l-sky-500',
          icon: Info,
          iconColor: 'text-sky-600 dark:text-sky-400'
        };
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md dark:shadow-xl transition-colors">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Security & Misconfiguration Findings</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Automated diagnosis with concrete evidence and actionable recommendations
          </p>
        </div>

        {/* Severity Filter Chips */}
        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-950 p-1 border border-slate-300 dark:border-slate-800 text-xs">
          <button
            onClick={() => setFilterSeverity('ALL')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterSeverity === 'ALL'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All ({findings.length})
          </button>
          <button
            onClick={() => setFilterSeverity('CRITICAL')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterSeverity === 'CRITICAL'
                ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
            }`}
          >
            Critical ({criticalCount})
          </button>
          <button
            onClick={() => setFilterSeverity('WARNING')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterSeverity === 'WARNING'
                ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-amber-700'
            }`}
          >
            Warnings ({warningCount})
          </button>
          <button
            onClick={() => setFilterSeverity('INFO')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterSeverity === 'INFO'
                ? 'bg-sky-100 text-sky-900 font-bold border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-sky-700'
            }`}
          >
            Info ({infoCount})
          </button>
        </div>
      </div>

      {/* Findings Cards List */}
      <div className="space-y-4">
        {filtered.map((item, index) => {
          const style = getSeverityStyle(item.severity);
          const Icon = style.icon;

          return (
            <div
              key={index}
              className={`p-5 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 border-l-4 ${style.border} transition-all hover:bg-slate-50 dark:hover:bg-slate-950 shadow-sm`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2">
                  <Icon className={`w-4 h-4 ${style.iconColor} flex-shrink-0`} />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    {item.category}
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${style.badge}`}>
                    {item.severity}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{item.description}</p>

              {/* Evidence Box */}
              {item.evidence && (
                <div className="mb-3">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Evidence:</p>
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-sky-300 break-all">
                    {item.evidence}
                  </div>
                </div>
              )}

              {/* Actionable Recommendation */}
              <div className="flex items-start space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800/60 text-xs">
                <Wrench className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Remediation: </span>
                  <span className="text-slate-700 dark:text-slate-300">{item.recommendation}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
