import React, { useEffect, useState } from 'react';
import {
  ListFilter,
  Search,
  Trash2,
  Eye,
  GitCompare,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client.js';
import { ScanComparison, ScanResult } from '@dnscheck/shared';

interface HistoryPageProps {
  onSelectScan: (scanId: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onSelectScan }) => {
  const [scans, setScans] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ScanComparison | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const res = await api.getHistory(searchTerm || undefined, 30, 0);
      setScans(res.scans);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [searchTerm]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteScan(id);
      await fetchHistory();
      if (selectedForCompare.includes(id)) {
        setSelectedForCompare(selectedForCompare.filter((s) => s !== id));
      }
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const toggleSelectForCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter((s) => s !== id));
    } else {
      if (selectedForCompare.length >= 2) {
        setSelectedForCompare([selectedForCompare[1], id]);
      } else {
        setSelectedForCompare([...selectedForCompare, id]);
      }
    }
  };

  const handleRunComparison = async () => {
    if (selectedForCompare.length !== 2) return;
    try {
      setIsComparing(true);
      const res = await api.compareScans(selectedForCompare[0], selectedForCompare[1]);
      setComparison(res);
    } catch (err) {
      console.error('Failed comparison', err);
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md dark:shadow-xl transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <ListFilter className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Persisted Scan History & Drift Comparison</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Historical records persisted to MongoDB. Select any two scans to run a side-by-side differential analysis.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRunComparison}
              disabled={selectedForCompare.length !== 2 || isComparing}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white transition-all shadow-md shadow-purple-600/20"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Compare Selected ({selectedForCompare.length}/2)</span>
            </button>
          </div>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search historical scans by domain name..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-xs"
          />
        </div>
      </div>

      {/* Comparison Drawer / Result if active */}
      {comparison && (
        <div className="bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800/60 rounded-2xl p-6 shadow-xl space-y-6 transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Scan A vs Scan B Differential Analysis</h4>
            </div>
            <button
              onClick={() => setComparison(null)}
              className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium"
            >
              Close Diff
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">Scan Baseline (A)</span>
              <p className="text-base font-bold font-mono text-slate-900 dark:text-white mt-1">{comparison.scanA.domain}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(comparison.scanA.timestamp).toLocaleString()}</p>
              <p className="text-sm font-mono text-emerald-700 dark:text-emerald-400 font-bold mt-2">
                {comparison.scanA.propagationPercentage}% Propagated ({comparison.scanA.overallStatus})
              </p>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-slate-950 border border-purple-200 dark:border-purple-800/50">
              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Scan Target (B)</span>
              <p className="text-base font-bold font-mono text-slate-900 dark:text-white mt-1">{comparison.scanB.domain}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(comparison.scanB.timestamp).toLocaleString()}</p>
              <p className="text-sm font-mono text-emerald-700 dark:text-emerald-400 font-bold mt-2">
                {comparison.scanB.propagationPercentage}% Propagated ({comparison.scanB.overallStatus})
              </p>
            </div>
          </div>

          {/* Record Changes Table */}
          <div>
            <h5 className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-2">DNS Record Changes</h5>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400 font-mono text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Scan A Value</th>
                    <th className="p-3">Scan B Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {comparison.recordChanges.map((change, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-950">
                      <td className="p-3 font-bold text-sky-700 dark:text-sky-400">{change.recordType}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            change.status === 'MODIFIED'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                              : change.status === 'ADDED'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                              : change.status === 'REMOVED'
                              ? 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                              : 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {change.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300 break-all">{change.scanAValues.join(', ') || '(None)'}</td>
                      <td className="p-3 text-purple-700 dark:text-purple-300 font-bold break-all">{change.scanBValues.join(', ') || '(None)'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-950/80 text-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] uppercase font-bold tracking-wider">
                <th className="py-3 px-4 w-12 text-center">Diff</th>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Propagation</th>
                <th className="py-3 px-4">Agreement</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {scans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-600 dark:text-slate-400 font-sans text-sm">
                    No scan history recorded in database. Run a scan to persist results.
                  </td>
                </tr>
              ) : (
                scans.map((s) => {
                  const isSelectedForComp = selectedForCompare.includes(s.id);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => onSelectScan(s.id)}
                      className="hover:bg-sky-50/50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => toggleSelectForCompare(s.id, e)}>
                        <input
                          type="checkbox"
                          checked={isSelectedForComp}
                          onChange={() => {}}
                          className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-purple-600 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <span className="text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 font-mono font-bold text-xs sm:text-sm tracking-tight transition-colors">
                          {s.domain}
                        </span>
                        {s.isDemo && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 font-sans font-bold">
                            DEMO
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 text-[11px] font-mono font-medium">
                        {new Date(s.startedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {s.propagationPercentage}%
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-mono font-medium">
                        {s.resolverAgreement} / 14
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            s.status === 'HEALTHY'
                              ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                              : s.status === 'PROPAGATING'
                              ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                              : 'bg-rose-100 dark:bg-rose-500/10 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectScan(s.id);
                            }}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 dark:text-sky-400"
                            title="Inspect Scan"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(s.id, e)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-400"
                            title="Delete Scan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
