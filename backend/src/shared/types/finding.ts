export type FindingSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type FindingCategory = 
  | 'SYNTAX'
  | 'PROPAGATION'
  | 'AUTHORITATIVE'
  | 'SECURITY_SPF'
  | 'SECURITY_DMARC'
  | 'SECURITY_MX'
  | 'SECURITY_CNAME'
  | 'SECURITY_THREAT'
  | 'PERFORMANCE'
  | 'AVAILABILITY';

export interface Finding {
  id?: string;
  scanId?: string;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  description: string;
  recordType?: string;
  evidence: string;
  recommendation: string;
  createdAt: string;
}

export interface SecurityScorecard {
  spf: {
    status: 'VALID' | 'WARNING' | 'ERROR' | 'MISSING';
    record?: string;
    details: string;
    allMechanism?: string;
    lookupCount?: number;
  };
  dmarc: {
    status: 'VALID' | 'WARNING' | 'ERROR' | 'MISSING';
    record?: string;
    policy?: 'none' | 'quarantine' | 'reject';
    rua?: string;
    details: string;
  };
  mx: {
    status: 'VALID' | 'WARNING' | 'ERROR' | 'MISSING';
    count: number;
    details: string;
    records: Array<{ exchange: string; priority: number; resolvable: boolean }>;
  };
  cname: {
    status: 'VALID' | 'WARNING' | 'CRITICAL' | 'N/A';
    dangling: boolean;
    details: string;
    target?: string;
  };
  dnssec?: {
    status: 'ENABLED' | 'DISABLED' | 'UNKNOWN';
    details: string;
  };
}
