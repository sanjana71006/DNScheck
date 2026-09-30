import React, { useState } from 'react';
import { Search, Loader2, ArrowRight, ShieldCheck, Sparkles, AlertCircle, Globe, Filter } from 'lucide-react';
import { DNSRecordType } from '@dnscheck/shared';

interface DomainScannerHeroProps {
  onScan: (domain: string, recordTypes: DNSRecordType[]) => void;
  isLoading: boolean;
  isDemoMode: boolean;
  initialDomain?: string;
}

export const DomainScannerHero: React.FC<DomainScannerHeroProps> = ({
  onScan,
  isLoading,
  isDemoMode,
  initialDomain = ''
}) => {
  const [domain, setDomain] = useState(initialDomain || 'example.com');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialDomain) {
      setDomain(initialDomain);
    }
  }, [initialDomain]);

  const RECORD_OPTIONS = [
    { label: 'ALL RECORDS', value: 'ALL' },
    { label: 'A (IPv4)', value: 'A' },
    { label: 'AAAA (IPv6)', value: 'AAAA' },
    { label: 'CNAME', value: 'CNAME' },
    { label: 'MX (Mail)', value: 'MX' },
    { label: 'TXT', value: 'TXT' },
    { label: 'NS (Delegation)', value: 'NS' },
    { label: 'SPF / DMARC', value: 'SPF_DMARC' }
  ];

  const PRESETS = [
    { name: 'example.com', label: 'example.com', badge: 'Standard / Null MX', dot: 'bg-emerald-400' },
    { name: 'cloudflare.com', label: 'cloudflare.com', badge: 'Enterprise Zone', dot: 'bg-sky-400' },
    { name: 'drift.cloud-migration.net', label: 'drift.cloud-migration.net', badge: 'Propagation Drift', dot: 'bg-amber-400' },
    { name: 'app.stale-takeover.dev', label: 'app.stale-takeover.dev', badge: 'Dangling CNAME', dot: 'bg-rose-400' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (!clean) {
      setError('Please enter a domain name.');
      return;
    }

    if (!clean.includes('.') || clean.split('.').length < 2) {
      setError('Please enter a valid domain name (e.g. example.com).');
      return;
    }

    setError(null);

    let types: DNSRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];
    if (selectedType === 'A') types = ['A'];
    else if (selectedType === 'AAAA') types = ['AAAA'];
    else if (selectedType === 'CNAME') types = ['CNAME'];
    else if (selectedType === 'MX') types = ['MX'];
    else if (selectedType === 'TXT') types = ['TXT'];
    else if (selectedType === 'NS') types = ['NS'];
    else if (selectedType === 'SPF_DMARC') types = ['TXT', 'A'];

    onScan(clean, types);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gradient-to-b dark:from-slate-900/90 dark:to-[#0c1220] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl transition-colors">
      {/* Subtle ambient lighting */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        {/* Header Titles */}
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-600 dark:text-sky-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Global DNS Observability & Misconfiguration Verifier</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Verify DNS Propagation & Record Health Globally
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Query authoritative nameservers directly and monitor live response convergence across 14 global resolver
            vantage points in North America, Europe, Asia, Oceania, and South America.
          </p>
        </div>

        {/* Unified Search Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col md:flex-row items-stretch gap-2.5 p-2 bg-slate-50 dark:bg-slate-950/90 border border-slate-300 dark:border-slate-700/80 rounded-2xl shadow-lg dark:shadow-2xl focus-within:border-sky-500/80 focus-within:ring-1 focus-within:ring-sky-500/50 transition-all">
            {/* Input field */}
            <div className="relative flex-grow flex items-center min-w-0">
              <Globe className="w-5 h-5 text-sky-500 dark:text-sky-400 ml-3 flex-shrink-0" />
              <input
                type="text"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter domain (e.g. example.com or api.domain.org)..."
                className="w-full bg-transparent pl-3 pr-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base font-mono focus:outline-none"
              />
            </div>

            {/* Record Type Dropdown */}
            <div className="flex items-center border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-2 md:pt-0 md:pl-2">
              <div className="relative w-full md:w-auto">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full md:w-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                >
                  {RECORD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Run DNS Check Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-bold text-sm transition-all shadow-md shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Probing DNS...</span>
                </>
              ) : (
                <>
                  <span>Run DNS Check</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-rose-500 dark:text-rose-400 text-xs px-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Test Scenario Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Demo Scenarios:</span>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setDomain(p.name);
                  setError(null);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-950/80 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800 transition-colors group"
              >
                <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">{p.label}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300">({p.badge})</span>
              </button>
            ))}
          </div>
        </form>

        {/* Security & Architecture Guardrail Footer */}
        <div className="flex items-center space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
          <span>
            <strong className="text-slate-800 dark:text-slate-200">Defensible DNS:</strong> Distinguishes Authoritative Nameserver baselines
            from Recursive Resolver observations. All queries are RFC-compliant passive lookups with zero exploitation.
          </span>
        </div>
      </div>
    </div>
  );
};
