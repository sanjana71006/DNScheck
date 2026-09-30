import React from 'react';
import { ShieldCheck, Mail, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Info, ExternalLink } from 'lucide-react';
import { SecurityScorecard } from '@dnscheck/shared';

interface SecurityScorecardViewProps {
  scorecard: SecurityScorecard;
}

export const SecurityScorecardView: React.FC<SecurityScorecardViewProps> = ({ scorecard }) => {
  if (!scorecard) return null;

  const { spf, dmarc, mx, cname } = scorecard;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VALID':
        return { label: 'VALID / SECURE', color: 'text-emerald-800 bg-emerald-100 border-emerald-300 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30', icon: CheckCircle2 };
      case 'WARNING':
        return { label: 'WARNING / REVIEW', color: 'text-amber-900 bg-amber-100 border-amber-300 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30', icon: AlertTriangle };
      case 'CRITICAL':
      case 'ERROR':
        return { label: 'CRITICAL / ACTION NEEDED', color: 'text-rose-800 bg-rose-100 border-rose-300 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/30', icon: XCircle };
      case 'MISSING':
        return { label: 'NOT CONFIGURED', color: 'text-slate-800 bg-slate-100 border-slate-300 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700', icon: Info };
      case 'N/A':
      default:
        return { label: 'N/A', color: 'text-slate-700 bg-slate-100 border-slate-300 dark:text-slate-500 dark:bg-slate-900 dark:border-slate-800', icon: Info };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. SPF Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">SPF (Sender Policy Framework)</h4>
            </div>
            {(() => {
              const b = getStatusBadge(spf.status);
              const Icon = b.icon;
              return (
                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-xs ${b.color}`}>
                  <Icon className="w-3 h-3" />
                  <span>{b.label}</span>
                </span>
              );
            })()}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{spf.details}</p>
          {spf.record && (
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold break-all mb-2">
              {spf.record}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-800/60">
          <span>Policy Mechanism: <strong className="text-slate-800 dark:text-slate-200">{spf.allMechanism || 'none'}</strong></span>
          <span>Lookups: <strong className="text-slate-800 dark:text-slate-200">{spf.lookupCount ?? 0} / 10</strong></span>
        </div>
      </div>

      {/* 2. DMARC Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">DMARC Authentication</h4>
            </div>
            {(() => {
              const b = getStatusBadge(dmarc.status);
              const Icon = b.icon;
              return (
                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-xs ${b.color}`}>
                  <Icon className="w-3 h-3" />
                  <span>{b.label}</span>
                </span>
              );
            })()}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{dmarc.details}</p>
          {dmarc.record && (
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 font-mono text-[11px] text-purple-700 dark:text-purple-300 font-semibold break-all mb-2">
              {dmarc.record}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-800/60">
          <span>Policy: <strong className="text-slate-800 dark:text-slate-200 uppercase">{dmarc.policy || 'none'}</strong></span>
          <span className="truncate max-w-[200px]">Reporting: <strong className="text-slate-800 dark:text-slate-200">{dmarc.rua ? 'Configured' : 'Missing'}</strong></span>
        </div>
      </div>

      {/* 3. MX Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">MX (Mail Exchanger) Records</h4>
            </div>
            {(() => {
              const b = getStatusBadge(mx.status);
              const Icon = b.icon;
              return (
                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-xs ${b.color}`}>
                  <Icon className="w-3 h-3" />
                  <span>{b.label}</span>
                </span>
              );
            })()}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{mx.details}</p>
          {mx.records && mx.records.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {mx.records.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                  <span className="text-sky-700 dark:text-sky-300 truncate max-w-[240px] font-semibold">Priority {r.priority}: {r.exchange}</span>
                  <span className={`text-[10px] font-bold ${r.resolvable ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {r.resolvable ? 'RESOLVABLE' : 'UNRESOLVED'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-800/60">
          Target Resolution: <strong className="text-slate-800 dark:text-slate-200">{mx.count} active host(s)</strong>
        </div>
      </div>

      {/* 4. CNAME Safety / Dangling Target Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">CNAME Takeover Safety</h4>
            </div>
            {(() => {
              const b = getStatusBadge(cname.status);
              const Icon = b.icon;
              return (
                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-xs ${b.color}`}>
                  <Icon className="w-3 h-3" />
                  <span>{b.label}</span>
                </span>
              );
            })()}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{cname.details}</p>
          {cname.target && (
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-amber-800 dark:text-amber-300 font-semibold break-all mb-2">
              Target: {cname.target}
            </div>
          )}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-800/60">
          Takeover Vulnerability: <strong className={cname.dangling ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}>
            {cname.dangling ? 'HIGH (Dangling Target Detected)' : 'None Detected (Safe)'}
          </strong>
        </div>
      </div>
    </div>
  );
};
