export type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'SPF' | 'DMARC';

export type QueryStatus = 'SUCCESS' | 'MATCH' | 'DIFFERENT' | 'NXDOMAIN' | 'SERVFAIL' | 'TIMEOUT' | 'ERROR' | 'MISMATCH' | 'REFUSED';

export interface MXRecordAnswer {
  exchange: string;
  priority: number;
}

export interface SOARecordAnswer {
  nsname: string;
  hostmaster: string;
  serial: number;
  refresh: number;
  retry: number;
  expire: number;
  minttl: number;
}

export type DNSAnswerValue = string | number | MXRecordAnswer | SOARecordAnswer | string[];

export interface NormalizedRecord {
  type: DNSRecordType;
  name: string;
  values: string[];
  ttl?: number;
}

export interface ResolverVantagePoint {
  id: string;
  provider: string;
  resolverIp: string;
  locationLabel: string;
  country: string;
  continent: 'North America' | 'Europe' | 'Asia' | 'Oceania' | 'South America' | 'Africa';
  latitude: number;
  longitude: number;
  tier?: 'public' | 'security' | 'privacy';
  networkType?: 'anycast' | 'unicast';
  transport?: 'UDP' | 'TCP' | 'DOH';
  dohEndpoint?: string;
}

export interface DnsFlags {
  aa?: boolean; // Authoritative Answer
  rd?: boolean; // Recursion Desired
  ra?: boolean; // Recursion Available
  ad?: boolean; // Authentic Data (DNSSEC)
  cd?: boolean; // Checking Disabled
}

export interface AuthoritativeEvidence {
  serverHostname?: string;
  serverIp?: string;
  recordType: DNSRecordType;
  answers: string[];
  rcode: string;
  flags?: DnsFlags;
  ttl?: number;
  latencyMs: number;
  timestamp: string;
  isAuthoritative: boolean;
  status: 'SUCCESS' | 'UNAVAILABLE' | 'TIMEOUT' | 'ERROR';
  errorMessage?: string;
}

export interface WhyDifferentExplanation {
  authoritativeAnswer: string[];
  resolverAnswer: string[];
  ttlReported?: number;
  checkedAt: string;
  authoritativeSource: string;
  possibleCauses: string[];
}

export interface ResolverQueryResult {
  resolverId: string;
  provider: string;
  resolverIp: string;
  locationLabel: string;
  country: string;
  continent: string;
  latitude: number;
  longitude: number;
  recordType: DNSRecordType;
  status: QueryStatus;
  answers: string[];
  normalizedAnswers: string[];
  ttl?: number;
  responseTimeMs: number;
  error?: string;
  matchesCanonical?: boolean;
  checkedAt: string;
  evidenceTag?: 'LIVE_QUERY' | 'DEMO_DATA';
  networkType?: 'anycast' | 'unicast';
  transport?: 'UDP' | 'TCP' | 'DOH';
  rcode?: string;
  flags?: DnsFlags;
  source?: 'LIVE_DNS' | 'DEMO_DATA';
  whyDifferent?: WhyDifferentExplanation;
}

export interface AuthoritativeNameserver {
  hostname: string;
  ipAddresses: string[];
  reachability: boolean;
  responseTimeMs: number;
  soaSerial?: number;
  error?: string;
}

export interface AuthoritativeResult {
  nameservers: AuthoritativeNameserver[];
  soaSerialsConsistent: boolean;
  dominantSerial?: number;
  canonicalRecords: Record<string, string[]>;
  recordTtvs?: Record<string, number>;
  source: 'authoritative' | 'reference_unavailable' | 'consensus_fallback';
  queriedAt: string;
  primaryNameserver?: string;
  nameserverIp?: string;
  isLive?: boolean;
  isAvailable?: boolean;
  evidence?: Record<string, AuthoritativeEvidence>;
  statusMessage?: string;
}
