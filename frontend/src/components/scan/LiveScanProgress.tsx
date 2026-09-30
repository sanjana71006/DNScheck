import React from 'react';
import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';
import { ScanStage } from '@dnscheck/shared';

interface LiveScanProgressProps {
  stages: ScanStage[];
  currentStageIndex: number;
}

export const LiveScanProgress: React.FC<LiveScanProgressProps> = ({ stages, currentStageIndex }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl my-6 transition-colors">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Live Execution Pipeline</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">Executing asynchronous DNS resolution and safety analysis stages</p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 px-3 py-1 rounded-md border border-sky-300 dark:border-sky-800/50 font-bold shadow-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600 dark:text-sky-400" />
          <span>Stage {Math.min(currentStageIndex + 1, stages.length)} of {stages.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {stages.map((s, idx) => {
          const isDone = s.status === 'COMPLETED' || idx < currentStageIndex;
          const isRunning = s.status === 'RUNNING' || idx === currentStageIndex;
          const isFailed = s.status === 'FAILED';

          return (
            <div
              key={s.stage}
              className={`flex items-start space-x-3 p-3 rounded-lg border transition-all ${
                isDone
                  ? 'bg-emerald-50 dark:bg-slate-950/40 border-emerald-300 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300 font-medium'
                  : isRunning
                  ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-400 dark:border-sky-700/60 text-sky-900 dark:text-sky-200 ring-1 ring-sky-500/30 font-semibold'
                  : isFailed
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-300'
                  : 'bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800/50 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isRunning ? (
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                ) : isFailed ? (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-tight truncate">{s.label}</p>
                {s.detail && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{s.detail}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
