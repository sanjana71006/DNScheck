import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ChevronRight,
  ChevronDown,
  Server,
  Globe,
  Database,
  Laptop,
  Cpu,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Layers,
  ArrowRight,
  ExternalLink,
  Code,
  Activity,
  FileText,
  Check,
  Sparkles,
  ArrowDown
} from 'lucide-react';

interface DnsStepInfo {
  id: string;
  number: number;
  title: string;
  actor: string;
  type: 'request' | 'referral' | 'answer' | 'cache' | 'error';
  summary: string;
  whatHappens: string;
  whyItMatters: string;
  dataInvolved: string;
  badge: string;
  qname?: string;
  qtype?: string;
  flags?: string;
  exampleData?: string;
}

const RESOLUTION_STEPS: DnsStepInfo[] = [
  {
    id: 'user_browser',
    number: 1,
    title: 'User / Browser Query Generation',
    actor: 'User Application & Browser',
    type: 'request',
    summary: 'The browser initiates navigation to www.example.com and checks application-level caches before issuing a system call.',
    whatHappens: 'When a user navigates to a URL, the web browser parses the domain name (QNAME = www.example.com) and initiates an A (IPv4) or AAAA (IPv6) query.',
    whyItMatters: 'Browsers maintain short internal DNS caches (typically 60 seconds) to prevent redundant system lookups during rapid asset loading.',
    dataInvolved: 'QNAME: www.example.com | QTYPE: A (Type 1) | QCLASS: IN (Internet Class 1)',
    badge: 'EXAMPLE DATA',
    qname: 'www.example.com',
    qtype: 'A',
    flags: 'RD=1 (Recursion Desired)'
  },
  {
    id: 'local_cache',
    number: 2,
    title: 'Local / OS Resolver Cache Evaluation',
    actor: 'Operating System Stub Resolver (systemd-resolved, Windows DNS Client, mDNSResponder)',
    type: 'cache',
    summary: 'The operating system stub resolver inspects its local memory cache and hosts file before dispatching network packets.',
    whatHappens: 'The OS checks whether an active Resource Record (RR) for www.example.com already exists in memory with remaining TTL > 0, or is statically declared in /etc/hosts.',
    whyItMatters: 'CRITICAL RULE: Cache hits skip upstream network queries completely. If an entry is cached, no recursive resolver is contacted.',
    dataInvolved: 'Local Cache Table: [RR Name, RR Type, Remaining TTL, Target IP]',
    badge: 'EXAMPLE DATA',
    exampleData: 'Branch: Cache Hit (instant return) vs. Cache Miss (proceed upstream)'
  },
  {
    id: 'recursive_resolver',
    number: 3,
    title: 'Public Recursive Resolver Ingestion',
    actor: 'Recursive Resolver (e.g. 8.8.8.8, 1.1.1.1, 9.9.9.9 or ISP)',
    type: 'request',
    summary: 'The stub resolver transmits a UDP port 53 query to its configured recursive resolver with Recursion Desired (RD = 1).',
    whatHappens: 'The client requests recursive service. The recursive resolver accepts responsibility for traversing the DNS hierarchy to find the definitive answer.',
    whyItMatters: 'PUBLIC RECURSIVE RESOLVERS ARE NOT AUTHORITATIVE NAMESERVERS. They merely perform iterative queries on behalf of clients and cache answers.',
    dataInvolved: 'Client IP -> Resolver IP | UDP Port 53 | Flags: RD=1 | QNAME: www.example.com',
    badge: 'EXAMPLE DATA',
    flags: 'RD=1 (Recursion Desired), RA=1 (Recursion Available in reply)'
  },
  {
    id: 'root_servers',
    number: 4,
    title: 'Root DNS Server Iteration',
    actor: 'Root DNS System (13 Named Root Clusters: A.ROOT-SERVERS.NET to M.ROOT-SERVERS.NET)',
    type: 'referral',
    summary: 'The recursive resolver queries the Root zone for www.example.com. The root responds with a referral toward the .com TLD.',
    whatHappens: 'The root system does not contain the final website IP address. It inspects the Top-Level Domain (.com) and returns NS records (delegations) and glue records pointing to the .com TLD nameservers.',
    whyItMatters: 'Root servers do NOT hold individual website records. Claiming root servers have every website IP is a fundamental misconception.',
    dataInvolved: 'Query: com. IN NS | Response: 13 .com TLD Nameservers (a.gtld-servers.net...) + Glue IPs',
    badge: 'EXAMPLE DATA'
  },
  {
    id: 'tld_servers',
    number: 5,
    title: 'TLD Nameserver Delegation',
    actor: '.com Top-Level Domain Registry (Verisign)',
    type: 'referral',
    summary: 'The recursive resolver contacts the .com TLD servers, which return the authoritative nameserver delegation for example.com.',
    whatHappens: 'The TLD registry servers store delegation records for all registered domains under .com. They return the NS records configured at the domain registrar.',
    whyItMatters: 'The TLD infrastructure provides delegation authority. In DNSCheck, detecting broken or uncoordinated TLD delegation is key to diagnosing outages.',
    dataInvolved: 'Referral: example.com. IN NS ns1.example.net, ns2.example.net | Glue IPs',
    badge: 'EXAMPLE / EDUCATIONAL DATA',
    exampleData: 'Delegation to ns1.example.net, ns2.example.net'
  },
  {
    id: 'authoritative_dns',
    number: 6,
    title: 'Authoritative Nameserver Query (AA=1)',
    actor: 'Authoritative Nameserver (e.g. ns1.example.net)',
    type: 'answer',
    summary: 'The recursive resolver queries the authoritative nameserver directly with RD=0. The server responds with AA=1 (Authoritative Answer).',
    whatHappens: 'The authoritative nameserver holds the primary zone file for example.com. It answers authoritatively for the specific record www.example.com A.',
    whyItMatters: 'The authoritative server is the SINGLE SOURCE OF TRUTH. Its responses have the AA (Authoritative Answer) bit set in byte 2 of the DNS header.',
    dataInvolved: 'Response: www.example.com. 300 IN A 93.184.216.34 | RCODE: 0 (NOERROR) | Flags: AA=1',
    badge: 'EXAMPLE DATA',
    exampleData: 'A = 93.184.216.34 (Educational baseline), TTL = 300s'
  },
  {
    id: 'resolver_cache',
    number: 7,
    title: 'Recursive Resolver Caching',
    actor: 'Recursive Resolver Cache Store',
    type: 'cache',
    summary: 'The recursive resolver stores the authoritative record in its local memory pool for the duration specified by the TTL.',
    whatHappens: 'The resolver marks the record as valid for 300 seconds. Subsequent queries from any client connected to this resolver vantage will receive cached answers.',
    whyItMatters: 'Caching is why DNS propagation is gradual across global regions. Resolvers only re-query the authoritative source after their local TTL expires.',
    dataInvolved: 'Cached RR: www.example.com -> 93.184.216.34 | Initial TTL: 300s | Caching Policy: RFC 1034/1035',
    badge: 'EXAMPLE DATA'
  },
  {
    id: 'client_response',
    number: 8,
    title: 'Delivery to Client & Connection',
    actor: 'User Browser & Destination Web Server',
    type: 'answer',
    summary: 'The recursive resolver sends the synthesized DNS answer back to the client OS, allowing the browser to establish TCP/TLS connections.',
    whatHappens: 'The browser receives IPv4 93.184.216.34, triggers TCP SYN handshake on port 443 (HTTPS), negotiates TLS 1.3, and sends HTTP/2 GET request.',
    whyItMatters: 'DNS resolution is the foundational prerequisite before any TCP connection, SSL certificate verification, or HTTP exchange can occur.',
    dataInvolved: 'Final Response: 93.184.216.34 | Target: Port 443 | Protocol: TLS 1.3 / HTTP/2',
    badge: 'EXAMPLE DATA',
    exampleData: 'Destination Handshake: 93.184.216.34:443'
  }
];

export const HowDnsWorksSection: React.FC = () => {
  // Step simulation state
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // TTL animation state
  const [ttlCount, setTtlCount] = useState<number>(300);
  const [isTtlActive, setIsTtlActive] = useState<boolean>(false);
  const [ttlSpeed, setTtlSpeed] = useState<number>(1);
  const ttlTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Interactive Flag / RCODE selection state
  const [selectedFlag, setSelectedFlag] = useState<string>('RD');
  const [selectedRcode, setSelectedRcode] = useState<number>(0);
  const [isQueryExpanded, setIsQueryExpanded] = useState<boolean>(true);

  // Auto-play resolution steps
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setActiveStepIndex((prev) => {
          if (prev >= RESOLUTION_STEPS.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 3500);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  // TTL countdown timer
  useEffect(() => {
    if (isTtlActive) {
      const intervalMs = Math.max(20, Math.floor(1000 / ttlSpeed));
      ttlTimerRef.current = setInterval(() => {
        setTtlCount((prev) => {
          if (prev <= 1) {
            setIsTtlActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, intervalMs);
    } else if (ttlTimerRef.current) {
      clearInterval(ttlTimerRef.current);
    }
    return () => {
      if (ttlTimerRef.current) clearInterval(ttlTimerRef.current);
    };
  }, [isTtlActive, ttlSpeed]);

  const activeStep = RESOLUTION_STEPS[activeStepIndex];

  return (
    <div className="space-y-12 my-10 pt-8 border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
      {/* SECTION HEADER */}
      <div className="bg-gradient-to-br from-slate-900 via-sky-950/40 to-slate-900 border border-sky-800/50 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-mono font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>INTERACTIVE ARCHITECTURE SPECIFICATION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            HOW DNS ACTUALLY WORKS
          </h2>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl font-light">
            From a domain name to an IP address — and how DNSCheck verifies the result.
          </p>
          <div className="flex flex-wrap gap-2 pt-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">RFC 1034 / 1035</span>
            <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">RFC 8484 (DoH)</span>
            <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">RFC 9499 (Terminology)</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: ANIMATED INTERACTIVE FLOW ENGINE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <span className="text-xs font-mono text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wider block">
              Section 1 &bull; End-to-End Resolution Pipeline
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              Normal DNS Resolution Walkthrough
            </h3>
          </div>

          {/* Interactive Player Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Start Resolution'}</span>
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setActiveStepIndex(0);
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Restart from beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveStepIndex((prev) => (prev < RESOLUTION_STEPS.length - 1 ? prev + 1 : 0))}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Next step"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Technical Accuracy Disclaimers Banner */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              Crucial Protocol Realities:
            </p>
            <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
              <strong>Cache hits can skip upstream DNS queries.</strong> An OS or resolver holding a valid cached record never contacts root, TLD, or authoritative servers. Actual resolver and client implementations vary across operating systems.
            </p>
          </div>
        </div>

        {/* Pipeline Stepper Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2">
          {RESOLUTION_STEPS.map((step, idx) => {
            const isActive = idx === activeStepIndex;
            const isCompleted = idx < activeStepIndex;

            let colorClasses = 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400';
            if (isActive) {
              if (step.type === 'request') colorClasses = 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/30 shadow-lg';
              else if (step.type === 'referral') colorClasses = 'border-purple-500 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/30 shadow-lg';
              else if (step.type === 'answer') colorClasses = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30 shadow-lg';
              else if (step.type === 'cache') colorClasses = 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/30 shadow-lg';
            } else if (isCompleted) {
              colorClasses = 'border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300';
            }

            return (
              <button
                key={step.id}
                onClick={() => {
                  setIsPlaying(false);
                  setActiveStepIndex(idx);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col justify-between h-24 ${colorClasses} hover:scale-102`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[10px] font-bold opacity-75">
                    0{step.number}
                  </span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />}
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                </div>
                <div>
                  <p className="font-bold text-[11px] leading-tight truncate">
                    {step.title.split(' ')[0]} {step.title.split(' ')[1]}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider opacity-75 font-mono mt-0.5">
                    {step.type}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ACTIVE NODE INSPECTION DRAWER */}
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-mono font-bold text-xs">
                {activeStep.number}
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {activeStep.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Actor: {activeStep.actor}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-mono text-[10px] font-bold self-start sm:self-auto">
              {activeStep.badge}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs">
              <span className="font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wide text-[10px] flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> What Happens Here?
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                {activeStep.whatHappens}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs">
              <span className="font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wide text-[10px] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Why It Matters
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                {activeStep.whyItMatters}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide text-[10px] flex items-center gap-1">
                <Code className="w-3.5 h-3.5" /> What DNS Data Is Involved?
              </span>
              <p className="text-slate-700 dark:text-slate-300 font-mono leading-relaxed text-[11px] break-all">
                {activeStep.dataInvolved}
              </p>
              {activeStep.exampleData && (
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono text-[10px] text-amber-700 dark:text-amber-400">
                  Example: {activeStep.exampleData}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: INTERACTIVE QUERY CARD (www.example.com) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Section 2 &bull; Educational Example: DNS Query Card
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            EXAMPLE DATA
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          Question: <strong className="text-slate-800 dark:text-slate-200">"What is the A record for www.example.com?"</strong> The example IP used below is strictly for educational illustration and does not represent a live query result.
        </p>

        <div className="rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-slate-950/80 p-4 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-sky-200 dark:border-slate-800 pb-2">
            <span className="text-sky-800 dark:text-sky-400 font-bold">RFC 1035 Question Section (QDCOUNT = 1)</span>
            <button
              onClick={() => setIsQueryExpanded(!isQueryExpanded)}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              {isQueryExpanded ? 'Collapse' : 'Expand'}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isQueryExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {isQueryExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px]">
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-sans">QNAME (Query Domain)</span>
                <span className="text-slate-900 dark:text-white font-bold text-xs mt-0.5 block">www.example.com</span>
                <span className="text-[9px] text-slate-400 font-sans mt-1 block">Length-prefixed labels: 3www7example3com0</span>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-sans">QTYPE (Query Type)</span>
                <span className="text-slate-900 dark:text-white font-bold text-xs mt-0.5 block">A (Type 1)</span>
                <span className="text-[9px] text-slate-400 font-sans mt-1 block">Requests 32-bit IPv4 address</span>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-sans">QCLASS (Query Class)</span>
                <span className="text-slate-900 dark:text-white font-bold text-xs mt-0.5 block">IN (Class 1)</span>
                <span className="text-[9px] text-slate-400 font-sans mt-1 block">Internet System Protocol</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTIONS 3 & 4: LOCAL CACHE & RECURSIVE RESOLVER SEMANTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 3: Local Cache */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Section 3 &bull; Local Cache Evaluation
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            The client-side/OS resolver may already possess usable cached information from previous lookups.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 space-y-1">
              <span className="font-bold text-emerald-800 dark:text-emerald-400 text-xs">CACHE HIT</span>
              <p className="text-[11px] text-emerald-900 dark:text-emerald-300 leading-snug">
                Return cached RR answer directly to the application. Zero network packets sent.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-800 space-y-1">
              <span className="font-bold text-sky-800 dark:text-sky-400 text-xs">CACHE MISS</span>
              <p className="text-[11px] text-sky-900 dark:text-sky-300 leading-snug">
                No active RR or TTL expired. Dispatches UDP query to recursive resolver.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <p>
              <strong>TTL Mechanics:</strong> TTL (Time to Live) governs how long an RR may remain cacheable.
            </p>
            <p className="text-[10px] text-slate-500 italic">
              Note: TTL does not guarantee an exact, simultaneous refresh moment across all clients and resolvers.
            </p>
          </div>
        </div>

        {/* Section 4: Recursive Resolver & RD/RA Semantics */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Section 4 &bull; Recursive Resolver & RD/RA Semantics
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Public recursive resolvers (<code className="font-bold text-sky-600">8.8.8.8</code>, <code className="font-bold text-sky-600">1.1.1.1</code>, <code className="font-bold text-sky-600">9.9.9.9</code>) are <strong>PUBLIC RECURSIVE RESOLVERS</strong>, NOT authoritative nameservers.
          </p>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <span className="text-slate-500">CLIENT &rarr; RESOLVER:</span>
              <span className="font-bold text-sky-700 dark:text-sky-300">RD = 1 (Recursion Desired)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">RESOLVER &rarr; CLIENT:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">RA = 1 (Recursion Available)</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-900 dark:text-amber-200">
            <strong>Critical Protocol Detail:</strong> RD=1 requests recursive service from the server. RD=1 alone does <em>not</em> prove that recursion was actually performed (the resolver might have answered from cache). RA=1 indicates the server supports recursive resolution. RD and RA must be evaluated together.
          </div>
        </div>
      </div>

      {/* SECTIONS 5, 6, 7: ROOT, TLD, AUTHORITATIVE NAMESERVERS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider block">
              Sections 5, 6, 7 &bull; The DNS Hierarchy
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              Root, TLD, and Authoritative Nameservers
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            EXAMPLE / EDUCATIONAL DATA
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          {/* Root */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider text-[11px]">
                5. Root DNS System
              </span>
              <span className="font-mono text-[10px] text-slate-400">. (Root)</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
              "The root system does not normally provide the final IP address for the requested website."
            </p>
            <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-400">
              Query: example.com<br />
              Action: Referral toward .com TLD
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Do NOT claim root servers contain every website IP address.
            </p>
          </div>

          {/* TLD */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider text-[11px]">
                6. TLD Nameservers
              </span>
              <span className="font-mono text-[10px] text-slate-400">.com TLD</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
              "The TLD infrastructure provides delegation information for the domain."
            </p>
            <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-400">
              Delegation for example.com:<br />
              &bull; ns1.example.net<br />
              &bull; ns2.example.net
            </div>
            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
              EXAMPLE / EDUCATIONAL DATA
            </span>
          </div>

          {/* Authoritative */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[11px]">
                7. Authoritative DNS
              </span>
              <span className="font-mono text-[10px] text-slate-400">Zone Apex</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
              "The authoritative server provides authoritative DNS data for its zone."
            </p>
            <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-emerald-700 dark:text-emerald-300">
              Query: www.example.com A<br />
              Answer: 93.184.216.34<br />
              TTL: 300s | Flags: AA=1
            </div>
            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
              EXAMPLE DATA (Not live)
            </span>
          </div>
        </div>
      </div>

      {/* SECTIONS 8 & 9: RESPONSE DELIVERY & INTERACTIVE TTL COUNTDOWN SIMULATOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 8: Response Flow */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <ArrowRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Section 8 &bull; Response Delivery Flow
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Authoritative DNS &rarr; Recursive Resolver &rarr; Client Application.
          </p>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Record Type:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">A</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Resource Answer:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">93.184.216.34</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Authoritative TTL:</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">300 seconds</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-right">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                EXAMPLE DATA
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            The recursive resolver caches the response according to TTL rules before returning it to the client.
          </p>
        </div>

        {/* Section 9: Interactive TTL Countdown Simulator */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Section 9 &bull; Interactive TTL Simulator
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
              EXAMPLE DATA
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            "TTL specifies the time interval for which an RR may be cached before the source should be consulted again."
          </p>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <div className="text-4xl sm:text-5xl font-extrabold font-mono text-sky-600 dark:text-sky-400">
              {ttlCount}s
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-sky-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${(ttlCount / 300) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-center space-x-2 pt-2">
              <button
                onClick={() => setIsTtlActive(!isTtlActive)}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors"
              >
                {isTtlActive ? 'Pause Countdown' : 'Start Countdown'}
              </button>
              <button
                onClick={() => {
                  setIsTtlActive(false);
                  setTtlCount(300);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
              >
                Reset (300s)
              </button>
              <button
                onClick={() => setTtlSpeed((prev) => (prev === 1 ? 10 : prev === 10 ? 50 : 1))}
                className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold"
              >
                {ttlSpeed}x Speed
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic">
            Do not claim all resolvers refresh at exactly the same instant. Different resolvers ingest and expire cache windows independently.
          </p>
        </div>
      </div>

      {/* SECTIONS 10, 11, 12: DNS WIRE MESSAGE STRUCTURE, FLAGS & RCODES */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <span className="text-xs font-mono text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wider block">
            Sections 10, 11, 12 &bull; RFC 1035 Packet Telemetry
          </span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            DNS Message Structure, Header Flags, and RCODEs
          </h3>
        </div>

        {/* Section 10: DNS Message Structure Visualizer */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-sky-500" />
            <span>RFC 1035 DNS Message Sections</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs font-mono">
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
              <span className="font-bold text-sky-800 dark:text-sky-300 block text-xs">HEADER</span>
              <p className="text-[10px] font-sans text-slate-600 dark:text-slate-400 mt-1">
                ID, QR bit, Opcode, Flags (AA, TC, RD, RA, AD), RCODE, Record counts.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
              <span className="font-bold text-purple-800 dark:text-purple-300 block text-xs">QUESTION</span>
              <p className="text-[10px] font-sans text-slate-600 dark:text-slate-400 mt-1">
                QNAME (domain), QTYPE (record type), QCLASS (internet class).
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 block text-xs">ANSWER</span>
              <p className="text-[10px] font-sans text-slate-600 dark:text-slate-400 mt-1">
                Resource Records that directly answer the question section.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <span className="font-bold text-amber-800 dark:text-amber-300 block text-xs">AUTHORITY</span>
              <p className="text-[10px] font-sans text-slate-600 dark:text-slate-400 mt-1">
                NS records pointing toward authoritative nameservers or SOA.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-slate-300 block text-xs">ADDITIONAL</span>
              <p className="text-[10px] font-sans text-slate-600 dark:text-slate-400 mt-1">
                Glue records (A/AAAA for NS hostnames), EDNS0 opt RR.
              </p>
            </div>
          </div>
        </div>

        {/* Section 11: Clickable DNS Flags Cards */}
        <div className="space-y-3 pt-2">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-purple-500" />
            <span>Clickable DNS Header Flags Explorer</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              {
                flag: 'RD',
                name: 'Recursion Desired',
                desc: 'Set by client to request recursive resolution from the resolver.',
                detail: 'Client -> Resolver (RD=1). Warning: RD alone does NOT prove recursion actually occurred.'
              },
              {
                flag: 'RA',
                name: 'Recursion Available',
                desc: 'Set by resolver to confirm it supports recursive resolution.',
                detail: 'Resolver -> Client (RA=1). Must be interpreted together with RD.'
              },
              {
                flag: 'AA',
                name: 'Authoritative Answer',
                desc: 'Set strictly by nameservers holding the canonical zone.',
                detail: 'Verified by DNSCheck during direct port 53 query to establish canonical truth.'
              },
              {
                flag: 'TC',
                name: 'Truncated Response',
                desc: 'Set when response exceeds 512 bytes over UDP without EDNS0.',
                detail: 'Signals the client to retry over TCP or use EDNS0 buffer.'
              },
              {
                flag: 'AD',
                name: 'Authentic Data (DNSSEC)',
                desc: 'Indicates the resolver verified cryptographic DNSSEC signatures.',
                detail: 'Confirms RRSIG and DS validation passed without tampering.'
              }
            ].map((f) => (
              <button
                key={f.flag}
                onClick={() => setSelectedFlag(f.flag)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedFlag === f.flag
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 ring-2 ring-sky-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="font-extrabold text-sm text-sky-600 dark:text-sky-400">{f.flag}</span>
                  {selectedFlag === f.flag && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
                </div>
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                  {f.name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {f.desc}
                </p>
              </button>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
            <strong className="text-slate-900 dark:text-white">Flag Detail: </strong>
            <span className="text-slate-700 dark:text-slate-300">
              {selectedFlag === 'RD' && 'Client sends RD = 1. "RD indicates that recursive service was requested; RD alone does not prove that recursion was actually performed."'}
              {selectedFlag === 'RA' && 'Resolver sends RA = 1. Indicates recursive querying is supported. If RA = 0, server refuses recursive service.'}
              {selectedFlag === 'AA' && 'AA = 1 confirms the responding server is the authoritative source for the zone. DNSCheck inspects this bit for reference verification.'}
              {selectedFlag === 'TC' && 'TC = 1 triggers TCP retry. Ensures large answer sets (such as DNSSEC keys) are received completely without truncation.'}
              {selectedFlag === 'AD' && 'AD = 1 confirms DNSSEC security validation succeeded on the recursive resolver.'}
            </span>
          </div>
        </div>

        {/* Section 12: Interactive RCODE Table */}
        <div className="space-y-3 pt-2">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Interactive DNS Response Codes (RCODE)</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {[
              { code: 0, name: 'NOERROR', desc: 'Success / Query completed normally' },
              { code: 1, name: 'FORMERR', desc: 'Format error in request packet' },
              { code: 2, name: 'SERVFAIL', desc: 'Server failure / Upstream timeout' },
              { code: 3, name: 'NXDOMAIN', desc: 'Non-existent domain name' },
              { code: 4, name: 'NOTIMP', desc: 'Requested query type not implemented' },
              { code: 5, name: 'REFUSED', desc: 'Server refused query due to policy' }
            ].map((rc) => (
              <button
                key={rc.code}
                onClick={() => setSelectedRcode(rc.code)}
                className={`p-2.5 rounded-xl border text-left transition-all font-mono text-xs ${
                  selectedRcode === rc.code
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 ring-2 ring-sky-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <span className="font-extrabold text-xs text-sky-700 dark:text-sky-400">RCODE {rc.code}</span>
                <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate mt-0.5">{rc.name}</p>
              </button>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
            <strong className="text-slate-900 dark:text-white">RCODE {selectedRcode} Meaning: </strong>
            <span className="text-slate-700 dark:text-slate-300">
              {selectedRcode === 0 && 'NOERROR (RCODE 0): The DNS query executed successfully. If records are returned, it represents active answers; if empty, it represents NODATA (domain exists, but requested record type does not).'}
              {selectedRcode === 1 && 'FORMERR (RCODE 1): The name server was unable to interpret the query packet format.'}
              {selectedRcode === 2 && 'SERVFAIL (RCODE 2): The name server encountered an internal failure or upstream authoritative timeout. In DNSCheck, SERVFAIL is treated as a query availability failure, NOT a record mismatch.'}
              {selectedRcode === 3 && 'NXDOMAIN (RCODE 3): Meaningful error: The domain name does not exist according to the authoritative zone.'}
              {selectedRcode === 4 && 'NOTIMP (RCODE 4): The name server does not support the requested opcode or query type.'}
              {selectedRcode === 5 && 'REFUSED (RCODE 5): The name server refused to perform the operation for policy or access-control reasons (e.g. closed recursive resolver).'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 13: HOW DNSCHECK CALCULATES RESULTS (FORMULAS) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block">
            Section 13 &bull; Mathematical Rigor
          </span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            HOW DNSCHECK CALCULATES RESULTS
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Deterministic formulas derived from live telemetric timestamps and normalized comparable response sets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Formula 1 */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide block">
              FORMULA 1: DNS QUERY LATENCY
            </span>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-sky-800 dark:text-sky-300 font-bold text-center">
              &Delta;t = t_response &minus; t_request
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-mono space-y-1">
              <p>Request: 10:00:00.000</p>
              <p>Response: 10:00:00.042</p>
              <p className="text-emerald-600 dark:text-emerald-400 font-bold">Latency = 42 ms</p>
            </div>
            <p className="text-[10px] text-slate-500 italic border-t border-slate-200 dark:border-slate-800 pt-2">
              CRITICAL: DNSCheck computes latency strictly from actual high-resolution socket timestamps. Never hardcoded.
            </p>
          </div>

          {/* Formula 2 */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide block">
              FORMULA 2: DNS CONVERGENCE
            </span>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-emerald-700 dark:text-emerald-300 font-bold text-center">
              P = (M / N) &times; 100
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-mono space-y-1">
              <p>M = Matching comparable responses (8)</p>
              <p>N = Total comparable responses (10)</p>
              <p className="text-emerald-600 dark:text-emerald-400 font-bold">P = (8 / 10) &times; 100 = 80.0%</p>
            </div>
            <p className="text-[10px] text-slate-500 italic border-t border-slate-200 dark:border-slate-800 pt-2">
              If authoritative reference is unavailable, P is marked NOT COMPARABLE (cannot divide by zero).
            </p>
          </div>

          {/* Formula 3 */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide block">
              FORMULA 3: RESOLVER AVAILABILITY
            </span>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm text-purple-700 dark:text-purple-300 font-bold text-center">
              A = (S / T) &times; 100
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-mono space-y-1">
              <p>S = Successful responses (10)</p>
              <p>T = Total vantage queries (12)</p>
              <p className="text-purple-600 dark:text-purple-400 font-bold">A = (10 / 12) &times; 100 = 83.3%</p>
            </div>
            <p className="text-[10px] text-slate-500 italic border-t border-slate-200 dark:border-slate-800 pt-2">
              CRITICAL DISTINCTION: Convergence % is separate from Availability %. Timeouts and SERVFAILs are network failures, NOT mismatches.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 14: RECORD-SET COMPARISON (UNORDERED SETS) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Section 14 &bull; Multi-Record Unordered Set Comparison
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          DNSCheck does NOT compare only one IP address or depend on array order. Multi-homed web infrastructures legitimately return multiple A and AAAA records in varying round-robin orders.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block">Raw Observed Arrays:</span>
            <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
              <p><span className="text-slate-500">Authoritative:</span> ['198.51.100.1', '198.51.100.2', '198.51.100.3']</p>
              <p><span className="text-slate-500">Resolver:</span> ['198.51.100.3', '198.51.100.1', '198.51.100.2']</p>
            </div>
            <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
              Normalized & Sorted: Set(Auth) == Set(Res) &rarr; MATCH ✓
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block">Divergent Response Set:</span>
            <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
              <p><span className="text-slate-500">Authoritative:</span> ['198.51.100.1', '198.51.100.2']</p>
              <p><span className="text-slate-500">Resolver:</span> ['203.0.113.5', '203.0.113.6']</p>
            </div>
            <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 font-bold">
              Set(Auth) &ne; Set(Res) &rarr; DIFFERENT RESPONSE ⚠
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 15: HOW DNS WORKS &rarr; HOW DNSCHECK VERIFIES DNS */}
      <div className="bg-gradient-to-r from-sky-900/40 via-purple-900/40 to-slate-900 border border-sky-800/50 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-mono uppercase tracking-wider text-sky-400 font-bold">
            Section 15 &bull; Architectural Transition
          </span>
          <div className="flex items-center justify-center space-x-3 text-lg sm:text-2xl font-extrabold text-white">
            <span>HOW DNS WORKS</span>
            <ArrowRight className="w-6 h-6 text-sky-400" />
            <span>HOW DNSCheck VERIFIES DNS</span>
          </div>
          <p className="text-xs text-slate-300 font-light">
            While standard clients query a single local resolver to reach a website, DNSCheck simultaneously queries the authoritative nameservers and global vantage points to audit consistency.
          </p>
        </div>

        {/* DNSCheck Pipeline Diagram */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
          {[
            'User Target Domain',
            'Discover NS Delegation',
            'Direct Port 53 Auth Query',
            'Canonical Reference',
            '14 Parallel Vantages',
            'Unordered Set Normalization',
            'Propagation Convergence %',
            'Security Engine (SPF/DMARC/MX)',
            'MongoDB Persistence',
            'Interactive World Map & Matrix'
          ].map((item, idx) => (
            <React.Fragment key={item}>
              <span className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 text-center font-bold shadow-xs">
                {item}
              </span>
              {idx < 9 && <ArrowRight className="w-3.5 h-3.5 text-sky-400 hidden sm:inline" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* SECTION 16: AUTHORITATIVE VS RECURSIVE RESOLVER COMPARISON */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Server className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span>Section 16 &bull; Authoritative DNS vs Recursive Resolvers</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3">Dimension</th>
                <th className="py-2.5 px-3">Authoritative Nameserver</th>
                <th className="py-2.5 px-3">Recursive Resolver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-[11px]">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">Zone Responsibility</td>
                <td className="py-2.5 px-3 text-purple-700 dark:text-purple-300 font-medium">Holds definitive, primary zone records for domain.</td>
                <td className="py-2.5 px-3 text-sky-700 dark:text-sky-300 font-medium">Holds NO zone files. Performs lookups on behalf of clients.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">AA (Authoritative Answer)</td>
                <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">AA = 1</td>
                <td className="py-2.5 px-3 font-mono text-slate-500">AA = 0</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">Caching Behavior</td>
                <td className="py-2.5 px-3">Does not cache its own zone; answers live from source.</td>
                <td className="py-2.5 px-3">Caches responses according to authoritative TTL windows.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">Examples</td>
                <td className="py-2.5 px-3 font-mono">ns1.example.com, route53.aws.com</td>
                <td className="py-2.5 px-3 font-mono">1.1.1.1 (Cloudflare), 8.8.8.8 (Google), 9.9.9.9 (Quad9)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
          CRITICAL: Never label public resolvers (1.1.1.1, 8.8.8.8) as authoritative nameservers simply because they successfully answer queries.
        </p>
      </div>

      {/* SECTION 17: DNS PROPAGATION PHYSICS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>Section 17 &bull; DNS Propagation Physics & Divergence Labeling</span>
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          "DNS propagation is not a single global synchronization event. Different recursive resolvers can temporarily observe different data because of caching and DNS behavior."
        </p>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="px-2 py-1 rounded bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 font-bold">1. DNS Change at Registrar / NS</span>
            <span className="text-slate-400">&rarr;</span>
            <span className="px-2 py-1 rounded bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300 font-bold">2. Auth Zone Updated</span>
            <span className="text-slate-400">&rarr;</span>
            <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold">3. Recursive Caches Expire</span>
            <span className="text-slate-400">&rarr;</span>
            <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 font-bold">4. Global Convergence</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
          <strong>Labeling Divergent Responses:</strong> Modern cloud infrastructures rotate Anycast IP pools and employ GeoDNS routing. If a vantage returns a different IP, DNSCheck labels it as <strong>DIFFERENT RESPONSE</strong> rather than automatically claiming <strong>STALE</strong>.
        </div>
      </div>

      {/* SECTION 18: REAL DNS VS DEMO DATA MODE ISOLATION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <span>Section 18 &bull; Real DNS Mode vs Demo Data Mode Integrity</span>
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          DNSCheck enforces strict isolation between live telemetry and educational simulation. Real DNS results always originate from actual UDP wire packets or RFC 8484 DoH queries.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 space-y-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
              🟢 LIVE DNS MODE
            </span>
            <p className="text-slate-700 dark:text-slate-300 font-sans text-[11px]">
              Actual live query on port 53 or official DoH. Latency measured from real socket timers. RCODE and DNS flags parsed byte-for-byte from wire packets.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
              DEMO DATA / SIMULATED
            </span>
            <p className="text-slate-700 dark:text-slate-300 font-sans text-[11px]">
              Controlled educational fixtures strictly for testing and demos. Every value is explicitly labeled DEMO DATA. Never mixed with live queries.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 20: SIDE-BY-SIDE SUMMARY (NORMAL DNS VS DNSCHECK) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Activity className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <span>Section 20 &bull; Normal DNS vs DNSCheck Side-by-Side</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white text-xs block">NORMAL DNS OPERATION</span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              "Normal DNS resolves a single name to connect a single client."
            </p>
            <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[10px] space-y-1 text-slate-700 dark:text-slate-300">
              Client &rarr; Local Resolver &rarr; Recursive Cache &rarr; Target IP &rarr; Connect
            </div>
          </div>

          <div className="p-4 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 space-y-2">
            <span className="font-bold text-sky-900 dark:text-sky-200 text-xs block">DNSCHECK AUDIT PLATFORM</span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              "DNSCheck observes, normalizes, and compares DNS responses across worldwide vantages to verify global consistency and configuration security."
            </p>
            <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[10px] space-y-1 text-sky-800 dark:text-sky-300">
              Domain &rarr; Auth NS Baseline + 14 Global Vantages &rarr; Set Comparison &rarr; Compliance Scorecard
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 21: TECHNICAL ACCURACY CHECKLIST */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Section 21 &bull; Technical Accuracy Verification Checklist
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          The 10 foundational rules enforced throughout DNSCheck's backend scan engine and visualization:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          {[
            'Cache hits can skip upstream queries completely.',
            'Recursive resolvers are not authoritative simply because they answer DNS queries.',
            'Root/TLD infrastructure provides delegation information, not website IPs.',
            'Authoritative servers provide authoritative zone data with AA=1.',
            'TTL controls DNS caching lifetime; it does not guarantee instant global refreshes.',
            'Multiple A/AAAA records can be valid simultaneously in unordered sets.',
            'Different TTL values represent caching windows, NOT record mismatches.',
            'Different answers do not automatically prove stale data (e.g. Anycast/GeoDNS).',
            'TIMEOUT and SERVFAIL are network query failures, NOT mismatches.',
            'Real DNS results must come from actual socket wire queries, never simulated.'
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 flex items-start space-x-2 text-slate-700 dark:text-slate-300 text-[11px]"
            >
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 22: TECHNICAL REFERENCES & OFFICIAL RFCS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Section 22 &bull; Official RFC Technical References
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          DNSCheck is engineered to conform directly with official Internet Engineering Task Force (IETF) RFC specifications:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <a
            href="https://www.rfc-editor.org/rfc/rfc1034"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-sky-500 transition-colors block group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-600 dark:text-sky-400">RFC 1034</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500" />
            </div>
            <p className="text-[11px] font-sans font-semibold text-slate-800 dark:text-slate-200 mt-1">
              Domain Names — Concepts and Facilities
            </p>
            <p className="text-[10px] font-sans text-slate-500 mt-1">
              Foundational DNS architectural concepts, tree domain space, and caching mechanics.
            </p>
          </a>

          <a
            href="https://www.rfc-editor.org/rfc/rfc1035"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-sky-500 transition-colors block group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-600 dark:text-sky-400">RFC 1035</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500" />
            </div>
            <p className="text-[11px] font-sans font-semibold text-slate-800 dark:text-slate-200 mt-1">
              Domain Names — Implementation & Specification
            </p>
            <p className="text-[10px] font-sans text-slate-500 mt-1">
              DNS wire protocol format, message headers, resource record encoding, and query types.
            </p>
          </a>

          <a
            href="https://www.rfc-editor.org/rfc/rfc9499"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-sky-500 transition-colors block group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-600 dark:text-sky-400">RFC 9499</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500" />
            </div>
            <p className="text-[11px] font-sans font-semibold text-slate-800 dark:text-slate-200 mt-1">
              DNS Terminology
            </p>
            <p className="text-[10px] font-sans text-slate-500 mt-1">
              Modern standard terminology: Authoritative Server, Stub Resolver, Recursive Resolver, Anycast.
            </p>
          </a>
        </div>
      </div>
    </div>
  );
};
