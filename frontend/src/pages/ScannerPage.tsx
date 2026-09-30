import React from 'react';
import { DomainScannerHero } from '../components/scan/DomainScannerHero.js';
import { LiveScanProgress } from '../components/scan/LiveScanProgress.js';
import { OverallStatusCard } from '../components/scan/OverallStatusCard.js';
import { RecordTable } from '../components/scan/RecordTable.js';
import { ResolverMatrix } from '../components/scan/ResolverMatrix.js';
import { Server, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ScanResult, ScanStage, DNSRecordType } from '@dnscheck/shared';

interface ScannerPageProps {
  currentScan: ScanResult | null;
  isLoading: boolean;
  isDemoMode: boolean;
  stages: ScanStage[];
  currentStageIndex: number;
  onScan: (domain: string, recordTypes: DNSRecordType[]) => void;
}

export const ScannerPage: React.FC<ScannerPageProps> = ({
  currentScan,
  isLoading,
  isDemoMode,
  stages,
  currentStageIndex,
  onScan
}) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <DomainScannerHero
        onScan={onScan}
        isLoading={isLoading}
        isDemoMode={isDemoMode}
        initialDomain={currentScan?.domain}
      />

      {isLoading && stages.length > 0 && (
        <LiveScanProgress stages={stages} currentStageIndex={currentStageIndex} />
      )}

      {currentScan && !isLoading && (
        <div className="space-y-8">
          <OverallStatusCard scan={currentScan} />

          {/* Authoritative Discovery Topology Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl transition-colors">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Server className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Authoritative Nameserver Topology</h3>
              </div>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  currentScan.authoritativeSummary.soaSerialsConsistent
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                    : 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30'
                }`}
              >
                {currentScan.authoritativeSummary.soaSerialsConsistent
                  ? 'SOA Serials Synchronized'
                  : 'SOA Serial Mismatch Detected'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentScan.authoritativeSummary.nameservers.map((ns, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-xs ${
                    ns.reachability
                      ? 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800'
                      : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold font-mono text-slate-900 dark:text-white truncate max-w-[200px]">{ns.hostname}</span>
                    <span className={`text-[10px] font-bold ${ns.reachability ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      {ns.reachability ? 'ONLINE' : 'UNREACHABLE'}
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px] font-mono">
                    <p>IP: <span className="text-slate-900 dark:text-slate-300 font-semibold">{ns.ipAddresses.join(', ') || 'N/A'}</span></p>
                    <p>Response: <span className="text-slate-900 dark:text-slate-300 font-semibold">{ns.responseTimeMs} ms</span></p>
                    <p>SOA Serial: <span className="text-sky-700 dark:text-sky-400 font-bold">{ns.soaSerial ?? 'N/A'}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DNS Record Table */}
          <RecordTable records={currentScan.records} resolverResults={currentScan.resolverResults} />

          {/* Resolver Vantage Matrix */}
          <ResolverMatrix results={currentScan.resolverResults} />
        </div>
      )}
    </div>
  );
};
