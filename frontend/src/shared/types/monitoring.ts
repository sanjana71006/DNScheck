import { DNSRecordType } from './dns.js';
import { ScanOverallStatus } from './scan.js';

export type MonitoringInterval = '1m' | '5m' | '15m' | '30m' | '1h';

export interface MonitoringJob {
  id: string;
  domain: string;
  recordTypes: DNSRecordType[];
  expectedValues?: Record<string, string[]>;
  interval: MonitoringInterval;
  active: boolean;
  createdAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  lastStatus?: ScanOverallStatus;
  lastPropagation?: number;
}

export interface MonitoringSnapshot {
  id?: string;
  jobId: string;
  domain: string;
  timestamp: string;
  propagationPercentage: number;
  resolverAgreement: number;
  status: ScanOverallStatus;
  findingsCount: {
    critical: number;
    warning: number;
    info: number;
  };
  durationMs: number;
}
