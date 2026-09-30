import { DNSRecordType, ResolverQueryResult, AuthoritativeResult } from './dns.js';
import { Finding, SecurityScorecard } from './finding.js';

export type ScanOverallStatus = 'HEALTHY' | 'PROPAGATING' | 'WARNING' | 'ERROR';

export interface ScanStage {
  stage: string;
  label: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  detail?: string;
}

export interface RecordPropagationSummary {
  recordType: DNSRecordType;
  canonicalValue: string[];
  totalResolvers: number;
  matchingResolvers: number;
  mismatchingResolvers: number;
  failingResolvers: number;
  propagationPercentage: number;
  availabilityPercentage: number;
  averageLatencyMs: number;
}

export interface ScanResult {
  id: string;
  domain: string;
  normalizedDomain: string;
  recordTypes: DNSRecordType[];
  isDemo: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  overallStatus: ScanOverallStatus;
  propagationPercentage: number;
  resolverAgreement: number;
  totalResolversQueried: number;
  authoritativeSummary: AuthoritativeResult;
  recordPropagation: Record<string, RecordPropagationSummary>;
  records: Array<{
    type: DNSRecordType;
    name: string;
    values: string[];
    ttl?: number;
    source: 'authoritative' | 'resolver_consensus';
    propagationPercentage: number;
    status: 'MATCH' | 'DIFFERENT' | 'MISMATCH' | 'WARNING';
  }>;
  resolverResults: ResolverQueryResult[];
  findings: Finding[];
  securityScorecard: SecurityScorecard;
}

export interface ScanComparison {
  scanA: {
    id: string;
    domain: string;
    timestamp: string;
    propagationPercentage: number;
    overallStatus: ScanOverallStatus;
  };
  scanB: {
    id: string;
    domain: string;
    timestamp: string;
    propagationPercentage: number;
    overallStatus: ScanOverallStatus;
  };
  propagationDelta: number;
  recordChanges: Array<{
    recordType: DNSRecordType;
    status: 'UNCHANGED' | 'MODIFIED' | 'ADDED' | 'REMOVED';
    scanAValues: string[];
    scanBValues: string[];
  }>;
  newFindings: Finding[];
  resolvedFindings: Finding[];
}
