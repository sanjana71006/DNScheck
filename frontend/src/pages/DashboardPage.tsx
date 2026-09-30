import React from 'react';
import { DomainScannerHero } from '../components/scan/DomainScannerHero.js';
import { LiveScanProgress } from '../components/scan/LiveScanProgress.js';
import { OverallStatusCard } from '../components/scan/OverallStatusCard.js';
import { GlobalPropagationMap } from '../components/map/GlobalPropagationMap.js';
import { PropagationChart } from '../components/charts/PropagationChart.js';
import { LatencyChart } from '../components/charts/LatencyChart.js';
import { SecurityScorecardView } from '../components/security/SecurityScorecardView.js';
import { FindingsList } from '../components/findings/FindingsList.js';
import { RecordTable } from '../components/scan/RecordTable.js';
import { ScanResult, ScanStage, DNSRecordType } from '@dnscheck/shared';
import { Layers } from 'lucide-react';

interface DashboardPageProps {
  currentScan: ScanResult | null;
  isLoading: boolean;
  isDemoMode: boolean;
  stages: ScanStage[];
  currentStageIndex: number;
  onScan: (domain: string, recordTypes: DNSRecordType[]) => void;
  setActiveTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentScan,
  isLoading,
  isDemoMode,
  stages,
  currentStageIndex,
  onScan,
  setActiveTab
}) => {
  // Dynamically resolve the primary record type queried in this scan
  const primaryType: DNSRecordType =
    (currentScan?.resolverResults?.[0]?.recordType as DNSRecordType) ||
    currentScan?.recordTypes?.[0] ||
    (Object.keys(currentScan?.recordPropagation || {})[0] as DNSRecordType) ||
    'A';

  const activePropagation =
    currentScan?.recordPropagation?.[primaryType] ||
    Object.values(currentScan?.recordPropagation || {})[0];

  const canonicalAnswer =
    activePropagation?.canonicalValue ||
    currentScan?.records?.find((r) => r.type === primaryType)?.values ||
    [];
  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Hero Scanner */}
      <DomainScannerHero
        onScan={onScan}
        isLoading={isLoading}
        isDemoMode={isDemoMode}
        initialDomain={currentScan?.domain}
      />

      {/* 2. Live Execution Stepper (shown while running) */}
      {isLoading && stages.length > 0 && (
        <LiveScanProgress stages={stages} currentStageIndex={currentStageIndex} />
      )}

      {/* 3. Scan Results (when ready) */}
      {currentScan && !isLoading && (
        <div className="space-y-8">
          {/* Overall Health Card */}
          <OverallStatusCard scan={currentScan} />

          {/* Interactive Global World Map */}
          <GlobalPropagationMap
            resolverResults={currentScan.resolverResults}
            canonicalAnswer={canonicalAnswer}
            authoritativeSummary={currentScan.authoritativeSummary}
            isDemo={currentScan.isDemo}
          />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activePropagation && (
              <PropagationChart propagation={activePropagation} />
            )}
            <LatencyChart resolverResults={currentScan.resolverResults} />
          </div>

          {/* Discovered DNS Records Table directly on Dashboard */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  DNS Records & Global Convergence ({currentScan.records?.length || 0} records discovered)
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('records')}
                className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-semibold"
              >
                Full records matrix &rarr;
              </button>
            </div>
            <RecordTable records={currentScan.records} resolverResults={currentScan.resolverResults} />
          </div>

          {/* Security Scorecard */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Security & Protocol Scorecard</h3>
              <button
                onClick={() => setActiveTab('findings')}
                className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-semibold"
              >
                View all findings &rarr;
              </button>
            </div>
            <SecurityScorecardView scorecard={currentScan.securityScorecard} />
          </div>

          {/* Top Misconfiguration Findings */}
          <FindingsList findings={currentScan.findings} />
        </div>
      )}
    </div>
  );
};
