import React from 'react';
import { BookOpen, Shield, Globe, Server, CheckCircle2, AlertTriangle, Terminal } from 'lucide-react';
import { HowDnsWorksSection } from '../components/docs/HowDnsWorksSection.js';

export const DocumentationPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in text-slate-300 text-sm leading-relaxed">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-sky-400 mb-2">
          <BookOpen className="w-4 h-4" />
          <span>Technical Whitepaper & Architecture Reference</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
          DNS Architecture & Convergence Mechanics
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          A comprehensive guide to DNS propagation physics, authoritative vs recursive delineation, and record verification algorithms implemented in DNSCheck.
        </p>
      </div>

      {/* Critical Judging Architecture Distinction */}
      <div className="p-6 rounded-2xl bg-sky-50/70 dark:bg-gradient-to-r dark:from-sky-950/50 dark:to-purple-950/40 border border-sky-200 dark:border-sky-800/60 shadow-lg text-slate-800 dark:text-slate-300">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 mb-2">
          <Server className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <span>Core Concept: Authoritative Nameservers vs Recursive Resolvers</span>
        </h3>
        <p className="mb-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          A critical architectural truth often misunderstood in network tooling:
          <strong className="text-sky-700 dark:text-sky-300"> Public recursive resolvers (e.g. 1.1.1.1, 8.8.8.8) are NOT authoritative nameservers.</strong>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950/80 border border-sky-200 dark:border-slate-800 shadow-sm">
            <span className="font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider text-[11px]">Authoritative Nameservers</span>
            <p className="text-slate-700 dark:text-slate-300 font-sans mt-1">
              Discovered via the domain's NS records (e.g., <code className="text-sky-700 dark:text-sky-300 font-bold">ns1.example.com</code>). They hold the true zone file. We query them directly to determine the canonical baseline answer and SOA serial synchronization.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950/80 border border-sky-200 dark:border-slate-800 shadow-sm">
            <span className="font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider text-[11px]">Recursive Resolver Vantages</span>
            <p className="text-slate-700 dark:text-slate-300 font-sans mt-1">
              Distributed vantage points (Cloudflare, Google, Quad9, AdGuard, CleanBrowsing across 6 continents). They cache answers based on TTL. We query them to observe global cache convergence.
            </p>
          </div>
        </div>
      </div>

      {/* Propagation Algorithm */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 transition-colors">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>How DNSCheck Calculates Global Propagation</span>
        </h3>
        <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          <li>
            <strong className="text-slate-900 dark:text-white">Authoritative Baseline Discovery:</strong> The backend queries NS records, resolves nameserver hostnames to IPs, and issues direct queries to establish canonical records and check SOA serial synchronization.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white">Multi-Vantage Parallel Queries:</strong> 14 distributed recursive resolvers are queried using Node.js native <code className="text-sky-700 dark:text-sky-400 font-semibold">dns/promises</code> with strict query timeouts and concurrency limits.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white">Canonical Normalization:</strong> Answers are normalized (stripping trailing dots, lowercasing hostnames, sorting IP arrays and MX priorities) so cosmetic ordering differences do not produce false mismatches.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white">Mathematical Scoring:</strong>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs my-2 text-sky-800 dark:text-sky-300">
              Propagation (%) = (Matching Resolvers / Total Configured Resolvers) × 100<br />
              Resolver Availability (%) = (Successful Responses / Total Configured Resolvers) × 100
            </div>
          </li>
        </ol>
      </div>

      {/* MAJOR INTERACTIVE SECTION: HOW DNS ACTUALLY WORKS */}
      <HowDnsWorksSection />

      {/* Record Validation Standards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 transition-colors">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span>Security & Compliance Engine Protocols</span>
        </h3>

        <div className="space-y-3 text-xs sm:text-sm">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sky-700 dark:text-sky-400 mb-1">SPF Validation (RFC 7208)</h4>
            <p className="text-slate-700 dark:text-slate-300">
              Detects missing SPF records, checks for the 10-lookup DNS evaluation limit, flags insecure <code className="text-amber-800 dark:text-amber-300 font-bold">+all</code> policies, and critically detects multiple SPF records which trigger an immediate <strong>PermError</strong> on receiving mail transfer agents.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-purple-700 dark:text-purple-400 mb-1">DMARC Authentication (RFC 7489)</h4>
            <p className="text-slate-700 dark:text-slate-300">
              Queries <code className="text-purple-700 dark:text-purple-300 font-bold">_dmarc.&lt;domain&gt;</code>, validates policy enforcement (<code className="text-slate-800 dark:text-slate-200 font-semibold">none</code>, <code className="text-slate-800 dark:text-slate-200 font-semibold">quarantine</code>, <code className="text-slate-800 dark:text-slate-200 font-semibold">reject</code>), inspects aggregate reporting URIs (<code className="text-slate-800 dark:text-slate-200">rua</code>), and flags duplicate DMARC records.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-cyan-700 dark:text-cyan-400 mb-1">MX & RFC 7505 Null MX Detection</h4>
            <p className="text-slate-700 dark:text-slate-300">
              Validates MX priorities (0–65535), tests whether mail target hostnames actively resolve to A/AAAA records, and explicitly supports <strong>RFC 7505 Null MX</strong> (<code className="text-slate-800 dark:text-slate-200 font-semibold">0 .</code>) where domains intentionally signal non-acceptance of email.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-1">Dangling CNAME Takeover Verification</h4>
            <p className="text-slate-700 dark:text-slate-300">
              Performs safe passive DNS resolution on CNAME targets. If a CNAME target points to an unresolvable hostname or returns NXDOMAIN (such as an abandoned cloud bucket or hosting slot), it raises a <strong>CRITICAL</strong> security alert with remediation steps.
            </p>
          </div>
        </div>
      </div>

      {/* Safety Guardrails */}
      <div className="p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs shadow-xs">
        <h4 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center space-x-2 mb-1">
          <CheckCircle2 className="w-4 h-4" />
          <span>Passive Safety & Operational Guardrails</span>
        </h4>
        <p className="text-slate-700 dark:text-slate-300">
          DNSCheck is strictly an observability and passive diagnostic platform. It never performs port scanning, arbitrary network probing, brute-force subdomain generation, or intrusive takeover exploitation. All operations are safe RFC-compliant DNS queries.
        </p>
      </div>
    </div>
  );
};
