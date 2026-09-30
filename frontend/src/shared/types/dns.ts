export type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'SPF' | 'DMARC';

export type QueryStatus = 'SUCCESS' | 'MATCH' | 'DIFFERENT' | 'NXDOMAIN' | 'SERVFAIL' | 'TIMEOUT' | 'ERROR' | 'MISMATCH';

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
  source: 'authoritative' | 'consensus_fallback';
  queriedAt: string;
  primaryNameserver?: string;
  nameserverIp?: string;
  isLive?: boolean;
}
