import React, { useState } from 'react';
import {
  Search,
  Globe,
  Copy,
  Check,
  Zap,
  ArrowRight,
  Server,
  Layers,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Network
} from 'lucide-react';
import { api } from '../../api/client.js';

interface QuickIpLookupProps {
  onScanDomain?: (domain: string) => void;
}

interface LookupResult {
  query: string;
  domain: string;
  matchedKeyword?: boolean;
  ipv4: string[];
  ipv6: string[];
  cnames: string[];
  ptrRecords?: Record<string, string[]>;
  totalIps: number;
  responseTimeMs: number;
  resolvedAt: string;
}

const POPULAR_QUERIES = [
  'google',
  'github',
  'cloudflare.com',
  'netflix',
  'openai',
  'amazon',
  'wikipedia.org'
];

export const QuickIpLookup: React.FC<QuickIpLookupProps> = ({ onScanDomain }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const handleCopy = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => {
      setCopiedIp(null);
    }, 2000);
  };

  const handleResolve = async (inputQuery?: string) => {
    const target = (inputQuery || query).trim();
    if (!target) return;

    setLoading(true);
    setError(null);

    const startTime = performance.now();

    try {
      // 1. Try our backend API quick-lookup endpoint
      const data = await api.quickLookup(target);
      if (data && (data.ipv4.length > 0 || data.ipv6.length > 0 || data.cnames.length > 0)) {
        setResult(data);
        setLoading(false);
        return;
      }
      throw new Error('No IP records found via backend resolver');
    } catch (backendErr) {
      // 2. Client-side DNS-over-HTTPS (DoH) fallback via Cloudflare for 100% resilience
      try {
        let clean = target
          .toLowerCase()
          .replace(/^(https?:\/\/)?(www\.)?/, '')
          .split('/')[0]
          .split(':')[0]
          .trim();

        if (!clean.includes('.')) {
          clean = `${clean}.com`;
        }

        // Fetch A (IPv4)
        const resA = await fetch(`https://cloudflare-dns.com/dns-query?name=${clean}&type=A`, {
          headers: { Accept: 'application/dns-json' }
        });
        const jsonA = await resA.json();
        const ipv4 = (jsonA.Answer || [])
          .filter((a: any) => a.type === 1)
          .map((a: any) => a.data);

        // Fetch AAAA (IPv6)
        const resAAAA = await fetch(`https://cloudflare-dns.com/dns-query?name=${clean}&type=AAAA`, {
          headers: { Accept: 'application/dns-json' }
        });
        const jsonAAAA = await resAAAA.json();
        const ipv6 = (jsonAAAA.Answer || [])
          .filter((a: any) => a.type === 28)
          .map((a: any) => a.data);

        const cnames = (jsonA.Answer || [])
          .filter((a: any) => a.type === 5)
          .map((a: any) => a.data);

        const duration = Math.round(performance.now() - startTime);

        if (ipv4.length > 0 || ipv6.length > 0) {
          setResult({
            query: target,
            domain: clean,
            matchedKeyword: !target.includes('.'),
            ipv4,
            ipv6,
            cnames,
            totalIps: ipv4.length + ipv6.length,
            responseTimeMs: duration,
            resolvedAt: new Date().toISOString()
          });
        } else {
          setError(`No IP addresses could be resolved for "${target}". Please check for typos.`);
        }
      } catch (dohErr) {
        setError(`Unable to resolve IP address for "${target}". Please verify the domain name.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleResolve();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl transition-colors relative isolate overflow-hidden">
      {/* Decorative gradient background glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-sky-500/10 dark:bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800 relative z-10">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
              <Network className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Website to IP Resolver & Quick Intelligence Lookup
            </h3>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30">
              INSTANT LOOKUP
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Instantly discover IPv4 & IPv6 addresses, reverse PTR hostnames, and aliases by entering any website domain or brand keyword.
          </p>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] text-slate-400 font-medium mr-1 hidden sm:inline">Try:</span>
          {POPULAR_QUERIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setQuery(item);
                handleResolve(item);
              }}
              className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-mono transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Input Search Box */}
      <div className="mt-5 relative z-10">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter domain or keyword (e.g. google, github, netflix.com, openai)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all font-mono"
            />
          </div>
          <button
            type="button"
            onClick={() => handleResolve()}
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-semibold text-xs sm:text-sm shadow-md shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all flex-shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Resolving...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Resolve IP Address</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-400 animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Resolved Results Card */}
      {result && !loading && (
        <div className="mt-6 p-5 rounded-xl bg-slate-50/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-4 animate-fade-in relative z-10">
          {/* Result Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                    {result.domain}
                  </span>
                  {result.matchedKeyword && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
                      Inferred from "{result.query}"
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {result.totalIps} IP {result.totalIps === 1 ? 'address' : 'addresses'} discovered &bull; Resolved in{' '}
                  <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">{result.responseTimeMs}ms</span>
                </p>
              </div>
            </div>

            {/* Launch Full Scan Action */}
            {onScanDomain && (
              <button
                type="button"
                onClick={() => onScanDomain(result.domain)}
                className="px-3.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:hover:bg-sky-500/25 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Deep Scan on 14 Global Vantages</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* IP Addresses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* IPv4 (A Records) */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  IPv4 Addresses (A Records)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {result.ipv4.length} {result.ipv4.length === 1 ? 'record' : 'records'}
                </span>
              </div>

              {result.ipv4.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {result.ipv4.map((ip) => {
                    const ptr = result.ptrRecords?.[ip]?.[0];
                    return (
                      <div
                        key={ip}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 group"
                      >
                        <div className="truncate mr-2">
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            {ip}
                          </span>
                          {ptr && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate block">
                              PTR: {ptr}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(ip)}
                          className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1 text-[10px]"
                          title="Copy IP Address"
                        >
                          {copiedIp === ip ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">No IPv4 addresses found.</p>
              )}
            </div>

            {/* IPv6 (AAAA Records) */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  IPv6 Addresses (AAAA Records)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {result.ipv6.length} {result.ipv6.length === 1 ? 'record' : 'records'}
                </span>
              </div>

              {result.ipv6.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {result.ipv6.map((ip) => (
                    <div
                      key={ip}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 group"
                    >
                      <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate mr-2">
                        {ip}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(ip)}
                        className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1 text-[10px] flex-shrink-0"
                        title="Copy IPv6 Address"
                      >
                        {copiedIp === ip ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">No IPv6 (AAAA) records configured for this domain.</p>
              )}
            </div>
          </div>

          {/* CNAME Aliases if present */}
          {result.cnames && result.cnames.length > 0 && (
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Canonical Alias (CNAME):</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{result.cnames.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
