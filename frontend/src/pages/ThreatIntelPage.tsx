import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  ExternalLink,
  Radio,
  Server,
  Terminal,
  Database,
  Eye,
  Info,
  ChevronLeft,
  ChevronRight,
  Flame,
  Bug,
  Globe2
} from 'lucide-react';
import { api } from '../api/client';

interface ThreatStats {
  totalQueries: number;
  maliciousCount: number;
  suspiciousCount: number;
  benignCount: number;
  uniqueDomainsCount: number;
  uniqueSensorsCount: number;
  threatBreakdown: Record<string, number>;
  topQueriedDomains: Array<{
    domain: string;
    count: number;
    threatCategory: string;
    isEvil: boolean;
    isSuspicious: boolean;
  }>;
  sensors: string[];
}

interface ThreatLog {
  _id: string;
  timestamp: string;
  sourceIP: string;
  destinationIP: string;
  dnsQuery: string;
  dnsAnswers: string[];
  dnsAnswerTTLs: number[];
  dnsQueryNames: string;
  dnsQueryClass: string;
  dnsQueryType: string;
  numberOfAnswers: number;
  dnsResponseCode: number;
  dnsOpCode: number;
  sensorId: string;
  isSuspicious: boolean;
  isEvil: boolean;
  threatCategory: string;
  threatDescription: string;
  riskScore: number;
}

interface ThreatIntelPageProps {
  onScanDomain?: (domain: string) => void;
}

export const ThreatIntelPage: React.FC<ThreatIntelPageProps> = ({ onScanDomain }) => {
  const [stats, setStats] = useState<ThreatStats | null>(null);
  const [logs, setLogs] = useState<ThreatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeLevel, setActiveLevel] = useState<'all' | 'evil' | 'sus' | 'benign'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSensor, setSelectedSensor] = useState('ALL');
  const [inspectLog, setInspectLog] = useState<ThreatLog | null>(null);
  const [reseedLoading, setReseedLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const data = await api.getThreatStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load threat stats:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getThreatLogs({
        page,
        limit: 15,
        level: activeLevel === 'all' ? undefined : activeLevel,
        sensorId: selectedSensor === 'ALL' ? undefined : selectedSensor,
        search: searchQuery
      });
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('Failed to load threat logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, activeLevel, selectedSensor, searchQuery]);

  const handleReseed = async () => {
    setReseedLoading(true);
    try {
      const res = await api.seedThreatData(true);
      setNotification(`Dataset reloaded: ${res.inserted} telemetry records synchronized to MongoDB.`);
      await fetchStats();
      await fetchLogs();
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification(`Failed to re-seed: ${err.message}`);
    } finally {
      setReseedLoading(false);
    }
  };

  const getThreatBadge = (log: ThreatLog) => {
    if (log.isEvil) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
          <Flame className="w-3.5 h-3.5" />
          MALICIOUS C2
        </span>
      );
    }
    if (log.isSuspicious) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
          <AlertTriangle className="w-3.5 h-3.5" />
          {log.threatCategory.replace('_', ' ')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
        <CheckCircle2 className="w-3.5 h-3.5" />
        BENIGN
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Notification */}
      {notification && (
        <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-sky-500 flex-shrink-0" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                DNS Threat Intelligence & Telemetry
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Real-world cloud VPC sensor queries labeled for threat vectors (Cryptomining C2, BIND reconnaissance, and scanner sweeps).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              fetchStats();
              fetchLogs();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm font-medium shadow-xs transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleReseed}
            disabled={reseedLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-sm font-semibold shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            {reseedLoading ? 'Reloading...' : 'Reload CSV to MongoDB'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Captured Queries</span>
            <Server className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats ? stats.totalQueries : '...'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Across all cloud sensor nodes</div>
        </div>

        {/* Card 2 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220] border border-rose-200 dark:border-rose-900/60 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Malicious C2 (Evil)</span>
            <Flame className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {stats ? stats.maliciousCount : '...'}
          </div>
          <div className="text-xs text-rose-700 dark:text-rose-300 font-medium mt-1">Active Cryptominer C2</div>
        </div>

        {/* Card 3 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220] border border-amber-200 dark:border-amber-900/60 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Suspicious Sweeps</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {stats ? stats.suspiciousCount : '...'}
          </div>
          <div className="text-xs text-amber-700 dark:text-amber-300 font-medium mt-1">Reconnaissance & BIND probes</div>
        </div>

        {/* Card 4 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sensor VPC Nodes</span>
            <Radio className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats ? stats.uniqueSensorsCount : '...'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Telemetry telemetry sources</div>
        </div>

        {/* Card 5 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Unique Domains</span>
            <Globe2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats ? stats.uniqueDomainsCount : '...'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Queried domain targets</div>
        </div>
      </div>

      {/* Threat Scenario Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-rose-600 text-white">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Monero Mining Pool C2</h3>
              <p className="text-xs text-rose-700 dark:text-rose-400 font-semibold">Flagged: evil=1, sus=1</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            Sensor host <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 font-mono text-rose-600 dark:text-rose-400">10.100.1.105</code> queried <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 font-mono text-rose-600 dark:text-rose-400">pool.hashvault.pro</code> resolving to external mining IPs <code className="font-mono">131.153.142.106</code>.
          </p>
          {onScanDomain && (
            <button
              onClick={() => onScanDomain('pool.hashvault.pro')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Scan pool.hashvault.pro in Live Scanner
            </button>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-600 text-white">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">BIND Version Fingerprinting</h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Flagged: sus=1 (Reconnaissance)</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            Attackers queried <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 font-mono text-amber-700 dark:text-amber-400">version.bind</code> in class CHAOS/IN against local resolvers to harvest DNS daemon versions and target known exploits.
          </p>
          {onScanDomain && (
            <button
              onClick={() => onScanDomain('version.bind')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Check version.bind in Live Scanner
            </button>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Open Resolver Scanning</h3>
              <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold">Flagged: sus=1 (External Sweep)</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            External scans from research networks (<code className="font-mono text-indigo-600 dark:text-indigo-400">researchscan541.eecs.umich.edu</code>, <code className="font-mono">openresolverproject.org</code>) testing for DNS amplification vectors.
          </p>
          {onScanDomain && (
            <button
              onClick={() => onScanDomain('openresolverproject.org')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Check openresolverproject.org
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Explorer Table Card */}
      <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Level Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <button
              onClick={() => {
                setActiveLevel('all');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeLevel === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Telemetry ({stats ? stats.totalQueries : '...'})
            </button>
            <button
              onClick={() => {
                setActiveLevel('evil');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeLevel === 'evil'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Malicious C2 ({stats ? stats.maliciousCount : 4})
            </button>
            <button
              onClick={() => {
                setActiveLevel('sus');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeLevel === 'sus'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Suspicious ({stats ? stats.suspiciousCount : 17})
            </button>
            <button
              onClick={() => {
                setActiveLevel('benign');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeLevel === 'benign'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Clean Baseline ({stats ? stats.benignCount : 248})
            </button>
          </div>

          {/* Search & Sensor filters */}
          <div className="flex items-center gap-3">
            {/* Sensor selector */}
            {stats && stats.sensors && (
              <select
                value={selectedSensor}
                onChange={(e) => {
                  setSelectedSensor(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">All Sensors ({stats.uniqueSensorsCount})</option>
                {stats.sensors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}

            {/* Search Box */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search domain or IP..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Table content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Threat Classification</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Queried Domain</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Source IP &rarr; Destination</th>
                <th className="py-3 px-4">Sensor Node</th>
                <th className="py-3 px-4">Resolved Answer / TTL</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-500 mb-2" />
                    Loading threat intelligence telemetry...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No threat telemetry logs matching the current criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log._id}
                    className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                      log.isEvil
                        ? 'bg-rose-50/30 dark:bg-rose-950/10'
                        : log.isSuspicious
                        ? 'bg-amber-50/30 dark:bg-amber-950/10'
                        : ''
                    }`}
                  >
                    {/* Classification */}
                    <td className="py-3 px-4 whitespace-nowrap font-sans">{getThreatBadge(log)}</td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>

                    {/* Domain */}
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                      {log.dnsQuery}
                    </td>

                    {/* Query Type */}
                    <td className="py-3 px-4 text-sky-600 dark:text-sky-400 font-bold whitespace-nowrap">
                      {log.dnsQueryType}
                    </td>

                    {/* Route */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <span className="text-slate-900 dark:text-white font-medium">{log.sourceIP}</span>
                      <span className="text-slate-400 mx-1.5">&rarr;</span>
                      <span className="text-slate-500">{log.destinationIP}</span>
                    </td>

                    {/* Sensor */}
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {log.sensorId}
                    </td>

                    {/* Answers */}
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                      {log.dnsAnswers && log.dnsAnswers.length > 0 ? (
                        <span>
                          {log.dnsAnswers.join(', ')}
                          {log.dnsAnswerTTLs && log.dnsAnswerTTLs.length > 0 && (
                            <span className="text-slate-400 ml-1">({log.dnsAnswerTTLs[0]}s)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No answers (RCode {log.dnsResponseCode})</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-sans">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setInspectLog(log)}
                          title="View telemetry packet details"
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {onScanDomain && (
                          <button
                            onClick={() => onScanDomain(log.dnsQuery)}
                            title="Run live DNS scan on this domain"
                            className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Live Scan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <span className="font-bold text-slate-900 dark:text-white">{logs.length}</span> of{' '}
            <span className="font-bold text-slate-900 dark:text-white">{totalCount}</span> telemetry entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Drill-down Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl text-white ${
                    inspectLog.isEvil ? 'bg-rose-600' : inspectLog.isSuspicious ? 'bg-amber-600' : 'bg-emerald-600'
                  }`}
                >
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Telemetry Packet Inspector
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{inspectLog.dnsQuery}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold px-2 py-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Threat Category:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{inspectLog.threatCategory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Risk Assessment:</span>
                  <span
                    className={`font-bold ${
                      inspectLog.riskScore > 80
                        ? 'text-rose-600 dark:text-rose-400'
                        : inspectLog.riskScore > 50
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {inspectLog.riskScore}/100 Risk Score
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 font-sans text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-bold">Security Analysis: </span>
                  {inspectLog.threatDescription}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Source IP</span>
                  <span className="text-slate-900 dark:text-white font-bold">{inspectLog.sourceIP}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Destination Resolver</span>
                  <span className="text-slate-900 dark:text-white font-bold">{inspectLog.destinationIP}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Query Class & Type</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {inspectLog.dnsQueryClass} / {inspectLog.dnsQueryType}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Sensor ID</span>
                  <span className="text-slate-900 dark:text-white font-bold">{inspectLog.sensorId}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">DNS Answer Payload</span>
                {inspectLog.dnsAnswers && inspectLog.dnsAnswers.length > 0 ? (
                  inspectLog.dnsAnswers.map((ans, idx) => (
                    <div key={idx} className="text-emerald-600 dark:text-emerald-400 font-bold">
                      &bull; {ans} (TTL: {inspectLog.dnsAnswerTTLs?.[idx] ?? 'N/A'}s)
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic">No answers returned (Response Code: {inspectLog.dnsResponseCode})</div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              {onScanDomain && (
                <button
                  onClick={() => {
                    const dom = inspectLog.dnsQuery;
                    setInspectLog(null);
                    onScanDomain(dom);
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20 flex items-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Check in Live Scanner
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

