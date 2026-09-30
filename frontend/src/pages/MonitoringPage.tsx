import React, { useEffect, useState } from 'react';
import {
  Clock,
  Plus,
  Play,
  Pause,
  Trash2,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertCircle,
  Activity,
  CheckCircle2,
  MapPin,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { MonitoringJob, MonitoringSnapshot, DNSRecordType } from '@dnscheck/shared';
import { api } from '../api/client.js';

interface MonitoringPageProps {
  currentDomain?: string;
  onScanDomain?: (domain: string, targetTab?: string) => void;
  setActiveTab?: (tab: string) => void;
}

export const MonitoringPage: React.FC<MonitoringPageProps> = ({
  currentDomain,
  onScanDomain,
  setActiveTab
}) => {
  const [jobs, setJobs] = useState<MonitoringJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<MonitoringJob | null>(null);
  const [snapshots, setSnapshots] = useState<MonitoringSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newInterval, setNewInterval] = useState<'1m' | '5m' | '15m' | '30m' | '1h'>('5m');
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const data = await api.listMonitoring();
      setJobs(data);
      if (data.length > 0 && !selectedJob) {
        setSelectedJob(data[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (!selectedJob) return;
    const fetchSnapshots = async () => {
      try {
        const snap = await api.getMonitoringSnapshots(selectedJob.id, 30);
        setSnapshots(snap);
      } catch (err: any) {
        console.error('Failed to load snapshots', err);
      }
    };
    fetchSnapshots();
    const timer = setInterval(fetchSnapshots, 15000);
    return () => clearInterval(timer);
  }, [selectedJob]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const domainVal = newDomain.trim();
    if (!domainVal) return;

    try {
      setError(null);
      await api.createMonitoring(domainVal, ['A', 'NS'], newInterval);
      setNewDomain('');
      await fetchJobs();
      
      // Automatically synchronize with all other application pages and trigger a global scan
      if (onScanDomain) {
        onScanDomain(domainVal);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSelectJob = (job: MonitoringJob) => {
    setSelectedJob(job);
    // Sync active domain with entire app (Dashboard, Global Map, Resolvers, etc.)
    if (onScanDomain) {
      onScanDomain(job.domain);
    }
  };

  const handleToggle = async (job: MonitoringJob) => {
    try {
      await api.toggleMonitoring(job.id, !job.active);
      await fetchJobs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMonitoring(id);
      if (selectedJob?.id === id) {
        setSelectedJob(null);
        setSnapshots([]);
      }
      await fetchJobs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const chartData = snapshots.map((s) => ({
    time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    propagation: s.propagationPercentage,
    agreement: s.resolverAgreement,
    status: s.status
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Domain Synchronization Status Banner */}
      {currentDomain && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-sky-50/80 dark:bg-gradient-to-r dark:from-sky-950/40 dark:via-slate-900 dark:to-slate-900 border border-sky-200 dark:border-sky-800/50 shadow-sm transition-colors">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-700 dark:text-slate-400 font-medium">Application Active Domain:</span>
            <span className="text-xs font-mono font-bold text-sky-700 dark:text-sky-300 bg-white dark:bg-sky-950 px-2.5 py-0.5 rounded border border-sky-200 dark:border-sky-800 shadow-xs">
              {currentDomain}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:inline">
              (Adding or selecting any domain here automatically syncs across Dashboard, Global Map, Resolvers & Records)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!jobs.some((j) => j.domain.toLowerCase() === currentDomain.toLowerCase()) ? (
              <button
                type="button"
                onClick={() => setNewDomain(currentDomain)}
                className="px-2.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-700 border border-sky-300 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 dark:text-sky-300 dark:border-sky-500/40 text-xs font-semibold transition-all"
              >
                + Monitor {currentDomain}
              </button>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active in All Pages
              </span>
            )}
          </div>
        </div>
      )}

      {/* Header & New Monitor Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md dark:shadow-xl transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Real-Time Propagation Monitoring</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Continuously observe DNS convergence over time and record automated timeline snapshots into MongoDB
            </p>
          </div>
        </div>

        {/* Add Monitor Form */}
        <form onSubmit={handleCreateJob} className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="Enter domain to monitor (e.g. cloudflare.com)..."
            className="w-full sm:flex-grow px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-xs"
          />

          <select
            value={newInterval}
            onChange={(e) => setNewInterval(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-xs"
          >
            <option value="1m">Every 1 min</option>
            <option value="5m">Every 5 min (Default)</option>
            <option value="15m">Every 15 min</option>
            <option value="30m">Every 30 min</option>
            <option value="1h">Every 1 hour</option>
          </select>

          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm transition-colors whitespace-nowrap shadow-sm shadow-sky-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Monitor</span>
          </button>
        </form>

        {error && (
          <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 text-xs mt-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Main Monitoring Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Jobs List */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col transition-colors">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
            <span>Configured Monitors ({jobs.length})</span>
            <Activity className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </h4>

          {jobs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              No monitoring jobs active yet. Register a domain above to start monitoring.
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
              {jobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                const isAppActive = currentDomain && job.domain.toLowerCase() === currentDomain.toLowerCase();
                return (
                  <div
                    key={job.id}
                    onClick={() => handleSelectJob(job)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-50/80 border-sky-400 dark:bg-sky-950/40 dark:border-sky-600/60 ring-1 ring-sky-500/30'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1.5 truncate max-w-[170px]">
                        <span className="font-bold font-mono text-sm text-slate-900 dark:text-white truncate">
                          {job.domain}
                        </span>
                        {isAppActive && (
                          <span className="text-[9px] px-1 py-0.5 rounded font-mono font-semibold bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40">
                            Synced
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          job.active
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {job.active ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                      <span>Interval: {job.interval}</span>
                      <span className="text-sky-400 font-bold">{job.lastPropagation ?? 0}% Propagated</span>
                    </div>

                    <div className="flex items-center justify-between space-x-2 mt-3 pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onScanDomain) onScanDomain(job.domain, 'dashboard');
                          else if (setActiveTab) setActiveTab('dashboard');
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1 transition-colors"
                        title="Inspect domain in Dashboard & Map"
                      >
                        <Activity className="w-3 h-3 text-sky-400" />
                        <span>Inspect &rarr;</span>
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(job);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                          title={job.active ? 'Pause Monitor' : 'Resume Monitor'}
                        >
                          {job.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(job.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                          title="Delete Monitor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Propagation Timeline Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-colors">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedJob ? `Propagation Timeline — ${selectedJob.domain}` : 'Select a domain to inspect timeline'}
                </h4>
              </div>

              {selectedJob && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/50 font-bold">
                    Current: {selectedJob.lastPropagation ?? 0}%
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (onScanDomain) onScanDomain(selectedJob.domain, 'dashboard');
                      else if (setActiveTab) setActiveTab('dashboard');
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 dark:text-sky-300 dark:border-sky-500/40 text-xs font-bold transition-all shadow-xs"
                    title="Open domain in Dashboard"
                  >
                    <Activity className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onScanDomain) onScanDomain(selectedJob.domain, 'map');
                      else if (setActiveTab) setActiveTab('map');
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-300 dark:border-emerald-500/40 text-xs font-bold transition-all shadow-xs"
                    title="Open domain in Global Map"
                  >
                    <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Map</span>
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">
              Tracks multi-resolver convergence progress over scheduled background checks
            </p>

            {snapshots.length > 0 ? (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-[#1e293b]" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} unit="%" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="propagation"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Waiting for first scheduled snapshot...</p>
                <p className="text-[11px] text-slate-500 mt-1">Background scheduler checks automatically.</p>
              </div>
            )}
          </div>

          {/* Snapshot History Table Preview */}
          {snapshots.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-300 mb-2 uppercase tracking-wider">Recent Timeline Snapshots</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                {snapshots.slice(-4).reverse().map((s, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]">
                    <p className="text-slate-600 dark:text-slate-400 font-semibold">{new Date(s.timestamp).toLocaleTimeString()}</p>
                    <p className="text-emerald-700 dark:text-emerald-400 font-extrabold text-sm mt-0.5">{s.propagationPercentage}%</p>
                    <p className="text-slate-700 dark:text-slate-400 text-[10px]">{s.resolverAgreement} vantages agree</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
