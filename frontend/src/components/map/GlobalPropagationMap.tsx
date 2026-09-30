import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { ResolverQueryResult } from '@dnscheck/shared';
import {
  Globe,
  MapPin,
  Info,
  Layers,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  ArrowLeftRight,
  Minimize2,
  Maximize2,
  HelpCircle,
  Server,
  Activity,
  Radio,
  Search,
  Zap,
  TrendingUp,
  Table as TableIcon
} from 'lucide-react';

interface GlobalPropagationMapProps {
  resolverResults: ResolverQueryResult[];
  canonicalAnswer?: string[];
  authoritativeSummary?: {
    primaryNameserver?: string;
    nameserverIp?: string;
    isLive?: boolean;
    canonicalRecords?: Record<string, string[]>;
    recordTtvs?: Record<string, number>;
  };
  isDemo?: boolean;
}

const MapEventsHandler: React.FC<{ onMapClick: () => void }> = ({ onMapClick }) => {
  useMapEvents({
    click: () => {
      onMapClick();
    }
  });
  return null;
};

export const GlobalPropagationMap: React.FC<GlobalPropagationMapProps> = ({
  resolverResults,
  canonicalAnswer = [],
  authoritativeSummary,
  isDemo = false
}) => {
  const [selectedContinent, setSelectedContinent] = useState<string>('ALL');
  const [hoveredResolver, setHoveredResolver] = useState<ResolverQueryResult | null>(null);
  const [lockedResolver, setLockedResolver] = useState<ResolverQueryResult | null>(null);
  const [dockSide, setDockSide] = useState<'left' | 'right'>('right');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'map' | 'matrix'>('map');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showWhyModal, setShowWhyModal] = useState<boolean>(false);

  const continents = ['ALL', 'North America', 'Europe', 'Asia', 'Oceania', 'South America'];

  // Telemetry Aggregations
  const totalCount = resolverResults.length;
  const matchingCount = resolverResults.filter((r) => r.matchesCanonical).length;
  const differentCount = resolverResults.filter((r) => !r.matchesCanonical && r.status === 'SUCCESS').length;
  const failureCount = resolverResults.filter(
    (r) => r.status === 'TIMEOUT' || r.status === 'SERVFAIL' || r.status === 'ERROR'
  ).length;
  const convergencePct = totalCount > 0 ? Math.round((matchingCount / totalCount) * 100) : 0;
  const avgLatency =
    totalCount > 0
      ? Math.round(resolverResults.reduce((acc, r) => acc + (r.responseTimeMs || 0), 0) / totalCount)
      : 0;
  const fastestResolver = useMemo(() => {
    if (resolverResults.length === 0) return null;
    return [...resolverResults].sort((a, b) => (a.responseTimeMs || 999) - (b.responseTimeMs || 999))[0];
  }, [resolverResults]);

  const filteredResolvers = useMemo(() => {
    if (selectedContinent === 'ALL') return resolverResults;
    return resolverResults.filter((r) => r.continent === selectedContinent);
  }, [resolverResults, selectedContinent]);

  const displayedResolvers = useMemo(() => {
    let list = filteredResolvers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.provider.toLowerCase().includes(q) ||
          r.resolverIp.includes(q) ||
          (r.locationLabel && r.locationLabel.toLowerCase().includes(q)) ||
          (r.country && r.country.toLowerCase().includes(q)) ||
          r.continent.toLowerCase().includes(q) ||
          (r.answers && r.answers.some((ans) => ans.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [filteredResolvers, searchQuery]);

  const activeResolver = lockedResolver || hoveredResolver;
  const isLocked = Boolean(lockedResolver);

  const handleCloseInfo = () => {
    setLockedResolver(null);
    setHoveredResolver(null);
    setIsMinimized(false);
    setShowWhyModal(false);
  };

  const handleMarkerHover = (res: ResolverQueryResult) => {
    if (!lockedResolver) {
      setDockSide(res.longitude >= 15 ? 'left' : 'right');
      setHoveredResolver(res);
      setShowWhyModal(false);
    }
  };

  const handleMarkerClick = (res: ResolverQueryResult) => {
    setDockSide(res.longitude >= 15 ? 'left' : 'right');
    setLockedResolver(res);
    setHoveredResolver(null);
    setIsMinimized(false);
  };

  const createCustomIcon = (res: ResolverQueryResult) => {
    let colorClass = 'bg-emerald-500 border-emerald-300 shadow-emerald-500/50';
    let pulseClass = 'glow-green';

    if (res.status === 'TIMEOUT' || res.status === 'SERVFAIL' || res.status === 'ERROR') {
      colorClass = 'bg-rose-500 border-rose-300 shadow-rose-500/50';
      pulseClass = 'glow-red';
    } else if (!res.matchesCanonical) {
      colorClass = 'bg-amber-400 border-amber-200 shadow-amber-500/50';
      pulseClass = 'glow-yellow';
    }

    const isCurrentActive = activeResolver?.resolverId === res.resolverId;

    return L.divIcon({
      className: 'custom-dns-pin',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-5 h-5 rounded-full ${colorClass} ${pulseClass} border-2 opacity-95 transition-all ${
            isCurrentActive ? 'scale-150 ring-2 ring-white' : 'hover:scale-125'
          }"></div>
          <div class="absolute w-2 h-2 rounded-full bg-white"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden transition-colors relative isolate z-0">
      {/* 1. Header & Live Indicator */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-sky-500 dark:text-sky-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Global DNS Resolver Vantage Points
            </h3>
            {isDemo ? (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                DEMO DATA — SIMULATED
              </span>
            ) : (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-500" /> LIVE RESOLVER QUERIES
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Observing propagation convergence across 14 Anycast vantage datacenters worldwide
          </p>
        </div>

        {/* View Mode Toggle & Continent Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented View Switcher: Map vs Telemetry Matrix */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>World Map</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Telemetry Matrix</span>
            </button>
          </div>

          {/* Continent Filter Pills */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 text-xs overflow-x-auto">
            {continents.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedContinent(c)}
                className={`px-2 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                  selectedContinent === c
                    ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {c === 'North America' ? 'N. America' : c === 'South America' ? 'S. America' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Key Telemetry Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold">
              Convergence
            </span>
            <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {convergencePct}%{' '}
              <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                ({matchingCount}/{totalCount})
              </span>
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold">
              Propagating / Diff
            </span>
            <span className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
              {differentCount}{' '}
              <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">vantages</span>
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold">
              Mean Global Latency
            </span>
            <span className="text-base font-bold font-mono text-sky-600 dark:text-sky-400">
              {avgLatency} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">ms</span>
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold">
              Fastest Edge Node
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate block">
              {fastestResolver ? `${fastestResolver.provider} (${fastestResolver.responseTimeMs}ms)` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Content: Interactive Map OR Telemetry Matrix */}
      <div className="relative w-full h-[500px] sm:h-[520px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-[#090d16] isolate z-0">
        {viewMode === 'map' ? (
          <MapContainer
            center={[25, 10]}
            zoom={2}
            minZoom={2}
            maxZoom={8}
            scrollWheelZoom={false}
            className="w-full h-full dark-map relative z-0"
          >
            <MapEventsHandler onMapClick={handleCloseInfo} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filteredResolvers.map((res) => (
              <Marker
                key={res.resolverId}
                position={[res.latitude, res.longitude]}
                icon={createCustomIcon(res)}
                eventHandlers={{
                  mouseover: () => handleMarkerHover(res),
                  mouseout: () => {
                    if (!lockedResolver) {
                      setHoveredResolver(null);
                    }
                  },
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    handleMarkerClick(res);
                  }
                }}
              >
                <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
                  <div className="p-1 font-sans text-xs">
                    <p className="font-bold text-slate-900">{res.provider} ({res.resolverIp})</p>
                    <p className="text-[11px] text-slate-600 font-mono">
                      Observed: {res.answers && res.answers.length > 0 ? res.answers.join(', ') : 'None'}
                    </p>
                    <p className={`text-[10px] font-bold mt-0.5 ${res.matchesCanonical ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {res.matchesCanonical ? '✓ MATCH' : '⚠ DIFFERENT RESPONSE'} &bull; {res.responseTimeMs}ms
                    </p>
                  </div>
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          /* Live Telemetry Matrix (Replacing useless crude SVG) */
          <div className="w-full h-full flex flex-col bg-white dark:bg-[#090d16] overflow-hidden text-xs">
            {/* Filter toolbar */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by city, country, provider, or IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center justify-between sm:justify-end gap-3">
                <span>
                  Showing <strong>{displayedResolvers.length}</strong> of {resolverResults.length} vantage nodes
                </span>
                {canonicalAnswer.length > 0 && (
                  <span className="hidden md:inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
                    Canonical: {canonicalAnswer.slice(0, 2).join(', ')}
                  </span>
                )}
              </div>
            </div>

            {/* High-density Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Vantage Datacenter</th>
                    <th className="py-2.5 px-3">Continent</th>
                    <th className="py-2.5 px-3">Latency</th>
                    <th className="py-2.5 px-3">Reported TTL</th>
                    <th className="py-2.5 px-3">Observed Answers</th>
                    <th className="py-2.5 px-3">Convergence</th>
                    <th className="py-2.5 px-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {displayedResolvers.map((res) => {
                    const isMatch = res.matchesCanonical;
                    const isFail = res.status === 'TIMEOUT' || res.status === 'SERVFAIL' || res.status === 'ERROR';

                    return (
                      <tr
                        key={res.resolverId}
                        onClick={() => handleMarkerClick(res)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors cursor-pointer group"
                      >
                        {/* Vantage Point */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                isMatch ? 'bg-emerald-500 glow-green' : isFail ? 'bg-rose-500 glow-red' : 'bg-amber-400 glow-yellow'
                              }`}
                            />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{res.provider}</span>
                                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-normal">
                                  {res.resolverIp}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {res.locationLabel ? `${res.locationLabel}, ${res.country}` : res.country}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Continent */}
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-medium">
                          {res.continent}
                        </td>

                        {/* Latency */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {res.responseTimeMs} ms
                            </span>
                            <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  res.responseTimeMs < 40
                                    ? 'bg-emerald-500'
                                    : res.responseTimeMs < 100
                                    ? 'bg-sky-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(15, (res.responseTimeMs / 180) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Reported TTL */}
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                          {res.ttl ? `${res.ttl}s` : 'N/A'}
                        </td>

                        {/* Observed Answers */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {res.answers && res.answers.length > 0 ? (
                              res.answers.map((ans) => (
                                <span
                                  key={ans}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                    isMatch
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                                      : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40'
                                  }`}
                                >
                                  {ans}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">(None)</span>
                            )}
                          </div>
                        </td>

                        {/* Convergence Badge */}
                        <td className="py-2.5 px-3">
                          {isMatch ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                              <CheckCircle2 className="w-3 h-3" /> MATCH
                            </span>
                          ) : isFail ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                              <XCircle className="w-3 h-3" /> {res.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                              <AlertTriangle className="w-3 h-3" /> DIFFERENT
                            </span>
                          )}
                        </td>

                        {/* Details / Inspect */}
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkerClick(res);
                            }}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/25 transition-colors"
                          >
                            Inspect &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {displayedResolvers.length === 0 && (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <p className="font-semibold text-sm">No vantage nodes match "{searchQuery}"</p>
                  <p className="text-xs mt-1">Try clearing your search query or switching continent filter.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedContinent('ALL');
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Map Legend Overlay */}
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 dark:bg-slate-950/90 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs flex items-center space-x-4 shadow-lg pointer-events-none transition-colors">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 glow-green" />
            <span className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">✓ MATCH</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 glow-yellow" />
            <span className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">⚠ DIFFERENT RESPONSE</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 glow-red" />
            <span className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">✕ TIMEOUT / ERROR</span>
          </div>
        </div>

        {/* Default Help Notice (shown when nothing is hovered or locked) */}
        {!activeResolver && (
          <div className="absolute top-3 right-3 z-10 max-w-xs bg-white/95 dark:bg-slate-950/90 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-[10px] text-slate-600 dark:text-slate-400 hidden sm:block pointer-events-none transition-colors shadow-md">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-sky-500 dark:text-sky-400 flex-shrink-0 mt-0.5" />
              <span>
                Hover on any vantage point to preview live DNS response, or click a location to lock the view.
              </span>
            </div>
          </div>
        )}

        {/* Minimized Floating Pill when Locked */}
        {activeResolver && isMinimized && (
          <div
            className={`absolute top-3 ${
              dockSide === 'left' ? 'left-3 sm:left-4' : 'right-3 sm:right-4'
            } z-20 flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-[#0d1322]/95 backdrop-blur-md border border-slate-300 dark:border-slate-700/80 shadow-xl text-xs animate-fade-in transition-all`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeResolver.matchesCanonical ? 'bg-emerald-400 glow-green' : 'bg-amber-400 glow-yellow'
              }`}
            />
            <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px]">
              {activeResolver.provider} ({activeResolver.resolverIp})
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                activeResolver.matchesCanonical
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
              }`}
            >
              {activeResolver.matchesCanonical ? 'MATCH' : 'DIFFERENT'}
            </span>
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 rounded text-sky-600 hover:text-sky-800 dark:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Expand full card"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCloseInfo}
              className="p-1 rounded text-rose-500 hover:text-rose-700 dark:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close (Exit)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Interactive Floating Vantage Info Container (Hover & Lock View) */}
        {activeResolver && !isMinimized && (
          <div
            onMouseLeave={() => {
              if (!lockedResolver) {
                setHoveredResolver(null);
              }
            }}
            className={`absolute top-3 ${
              dockSide === 'left' ? 'left-3 sm:left-4' : 'right-3 sm:right-4'
            } z-20 w-[calc(100%-24px)] sm:w-[420px] max-h-[calc(100%-24px)] flex flex-col bg-white/95 dark:bg-[#0d1322]/95 backdrop-blur-md border border-slate-300 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-fade-in transition-all`}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70">
              <div className="flex items-center space-x-2.5 truncate mr-2">
                <span
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    activeResolver.matchesCanonical
                      ? 'bg-emerald-400 glow-green'
                      : activeResolver.status === 'TIMEOUT' ||
                        activeResolver.status === 'SERVFAIL' ||
                        activeResolver.status === 'ERROR'
                      ? 'bg-rose-500 glow-red'
                      : 'bg-amber-400 glow-yellow'
                  }`}
                />
                <div className="truncate">
                  <div className="flex items-center space-x-1.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {activeResolver.provider}
                    </h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                      {activeResolver.resolverIp}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Anycast Resolver Vantage (Global Edge)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1 flex-shrink-0">
                {/* Flip Dock Side Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDockSide((prev) => (prev === 'right' ? 'left' : 'right'));
                  }}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  title={`Move container to ${dockSide === 'right' ? 'Left' : 'Right'}`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>

                {/* Minimize Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(true);
                  }}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  title="Minimize container to compact pill"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>

                {/* Lock Badge */}
                {isLocked ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                    Hovering
                  </span>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={handleCloseInfo}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ml-1"
                  title="Close Info Container (Exit)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Card Body */}
            <div className="p-4 space-y-3.5 text-xs overflow-y-auto max-h-[440px]">
              {/* Latency & TTL Telemetry Grid */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-[11px]">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Latency</span>
                  <span className="text-sky-600 dark:text-sky-400 font-mono font-bold block">
                    {activeResolver.responseTimeMs} ms
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block">TTL Reported</span>
                  <span className="text-slate-800 dark:text-slate-300 font-mono block">
                    {activeResolver.ttl ? `${activeResolver.ttl}s` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Queried</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono block truncate">
                    {new Date(activeResolver.checkedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* SEPARATE BLOCK 1: Authoritative DNS Source */}
              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                    <Server className="w-3.5 h-3.5 text-sky-500" />
                    <span>Authoritative DNS</span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    isDemo
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                  }`}>
                    {isDemo ? 'DEMO DATA — SIMULATED' : '✓ Authoritative query — LIVE'}
                  </span>
                </div>

                <div className="text-[11px] space-y-1">
                  <div className="flex items-baseline justify-between text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400">NS Authority:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                      {authoritativeSummary?.primaryNameserver || 'Authoritative NS'} {authoritativeSummary?.nameserverIp ? `(${authoritativeSummary.nameserverIp})` : ''}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400">Record Type:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {activeResolver.recordType || 'A'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                    Authoritative Answer Set:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {canonicalAnswer.length > 0 ? (
                      canonicalAnswer.map((ip) => (
                        <span
                          key={ip}
                          className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-mono text-[11px] font-medium"
                        >
                          {ip}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">(Empty or parent delegation)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* SEPARATE BLOCK 2: Resolver Observation */}
              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                    <Activity className="w-3.5 h-3.5 text-sky-500" />
                    <span>{activeResolver.provider} {activeResolver.resolverIp}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    isDemo
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                      : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-400'
                  }`}>
                    {isDemo ? 'DEMO DATA — SIMULATED' : '✓ Resolver query — LIVE'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                    Observed {activeResolver.recordType || 'A'}:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {activeResolver.answers && activeResolver.answers.length > 0 ? (
                      activeResolver.answers.map((ip) => (
                        <span
                          key={ip}
                          className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-medium border ${
                            activeResolver.matchesCanonical
                              ? 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                              : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {ip}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">(No answers returned)</span>
                    )}
                  </div>
                </div>

                {/* Status Verdict & Why Button */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {activeResolver.matchesCanonical ? (
                      <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>✓ MATCH</span>
                      </span>
                    ) : activeResolver.status === 'TIMEOUT' ||
                      activeResolver.status === 'SERVFAIL' ||
                      activeResolver.status === 'ERROR' ? (
                      <span className="flex items-center space-x-1 text-rose-600 dark:text-rose-400 font-bold text-xs">
                        <XCircle className="w-4 h-4" />
                        <span>✕ {activeResolver.status}</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4" />
                        <span>⚠ DIFFERENT RESPONSE</span>
                      </span>
                    )}
                  </div>

                  {/* Why Button if different */}
                  {!activeResolver.matchesCanonical && (
                    <button
                      type="button"
                      onClick={() => setShowWhyModal(!showWhyModal)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center space-x-1 transition-colors shadow-sm"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Why?</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Interactive "Why?" Detailed Explanation Box (Inline Drawer) */}
              {showWhyModal && !activeResolver.matchesCanonical && (
                <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 space-y-2.5 animate-fade-in text-[11px]">
                  <div className="flex items-center justify-between text-amber-900 dark:text-amber-200 font-bold">
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Technical Root-Cause Analysis
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowWhyModal(false)}
                      className="text-amber-700 dark:text-amber-400 hover:text-amber-900"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[10px]">
                    <strong>Not automatically stale:</strong> Modern global infrastructures (e.g. Cloudflare, AWS Route 53, Akamai, Azure) rotate IP pools and deploy GeoDNS Anycast routing. Distinct public resolvers legitimately return distinct valid IP addresses from the authoritative pool.
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-amber-200 dark:border-amber-800/60">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block font-semibold">Authoritative Answer:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 block truncate">
                        {canonicalAnswer.join(', ') || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block font-semibold">Resolver Answer:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 block truncate">
                        {activeResolver.answers?.join(', ') || 'None'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-900/60 p-2 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                    TTL Caching Window: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{activeResolver.ttl || 300}s</span>. Resolvers cache previous responses until their TTL expires before re-querying the authoritative nameserver.
                  </div>
                </div>
              )}

              {/* Footer Details & Exit Button */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 dark:text-slate-400 font-mono">
                  Queried: {new Date(activeResolver.checkedAt).toLocaleTimeString()}
                </span>

                {isLocked ? (
                  <button
                    type="button"
                    onClick={handleCloseInfo}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-300 dark:border-rose-500/40 font-semibold transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <X className="w-3 h-3" />
                    <span>Exit</span>
                  </button>
                ) : (
                  <span className="text-sky-600 dark:text-sky-400 font-medium">Click pin to lock view 📌</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
