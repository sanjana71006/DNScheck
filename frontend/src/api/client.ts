import {
  ScanResult,
  ScanComparison,
  MonitoringJob,
  MonitoringSnapshot,
  DNSRecordType,
  ScanStage
} from '@dnscheck/shared';

const getApiBase = (): string => {
  // 1. Literal import.meta.env pattern for Vite compile-time replacement
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    const clean = envUrl.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // 2. Automatic production fallback when running on Render
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    return 'https://dnscheck-backend.onrender.com/api';
  }

  // 3. Local development fallback (Vite proxy)
  return '/api';
};

const API_BASE = getApiBase();

export class ApiError extends Error {
  code: string;
  details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    const err = data.error || { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred.' };
    throw new ApiError(err.code, err.message, err.details);
  }

  return data.data !== undefined ? data.data : data;
}

export const api = {
  async startScan(domain: string, recordTypes?: DNSRecordType[], isDemo = false): Promise<ScanResult> {
    return request<ScanResult>('/scans', {
      method: 'POST',
      body: JSON.stringify({ domain, recordTypes, isDemo })
    });
  },

  streamScan(
    domain: string,
    recordTypes?: DNSRecordType[],
    isDemo = false,
    callbacks: {
      onStage: (stage: ScanStage) => void;
      onComplete: (result: ScanResult) => void;
      onError: (err: { code: string; message: string }) => void;
    } = { onStage: () => {}, onComplete: () => {}, onError: () => {} }
  ): () => void {
    const params = new URLSearchParams({
      domain,
      isDemo: String(isDemo)
    });
    if (recordTypes && recordTypes.length > 0) {
      params.set('recordTypes', recordTypes.join(','));
    }

    const eventSource = new EventSource(`${API_BASE}/scans/stream?${params.toString()}`);

    eventSource.addEventListener('stage', (event: MessageEvent) => {
      try {
        const stageData = JSON.parse(event.data);
        callbacks.onStage(stageData);
      } catch (e) {
        console.error('Failed to parse SSE stage payload', e);
      }
    });

    eventSource.addEventListener('complete', (event: MessageEvent) => {
      try {
        const completeData = JSON.parse(event.data);
        callbacks.onComplete(completeData);
        eventSource.close();
      } catch (e) {
        console.error('Failed to parse SSE complete payload', e);
      }
    });

    eventSource.addEventListener('error', (event: any) => {
      try {
        const errorData = event.data ? JSON.parse(event.data) : { code: 'STREAM_ERROR', message: 'SSE connection failed.' };
        callbacks.onError(errorData);
      } catch {
        callbacks.onError({ code: 'STREAM_ERROR', message: 'Connection to scan stream dropped.' });
      }
      eventSource.close();
    });

    return () => eventSource.close();
  },

  async getScan(id: string): Promise<ScanResult> {
    return request<ScanResult>(`/scans/${id}`);
  },

  async deleteScan(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/scans/${id}`, { method: 'DELETE' });
  },

  async getHistory(domain?: string, limit = 25, skip = 0): Promise<{ scans: any[]; total: number }> {
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    if (domain) params.set('domain', domain);
    return request<{ scans: any[]; total: number }>(`/history?${params.toString()}`);
  },

  async compareScans(scanA: string, scanB: string): Promise<ScanComparison> {
    return request<ScanComparison>(`/compare?scanA=${scanA}&scanB=${scanB}`);
  },

  async listMonitoring(): Promise<MonitoringJob[]> {
    return request<MonitoringJob[]>('/monitoring');
  },

  async createMonitoring(
    domain: string,
    recordTypes?: DNSRecordType[],
    interval?: string
  ): Promise<MonitoringJob> {
    return request<MonitoringJob>('/monitoring', {
      method: 'POST',
      body: JSON.stringify({ domain, recordTypes, interval })
    });
  },

  async toggleMonitoring(id: string, active?: boolean, interval?: string): Promise<MonitoringJob> {
    return request<MonitoringJob>(`/monitoring/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active, interval })
    });
  },

  async deleteMonitoring(id: string): Promise<void> {
    return request<void>(`/monitoring/${id}`, { method: 'DELETE' });
  },

  async getMonitoringSnapshots(id: string, limit = 50): Promise<MonitoringSnapshot[]> {
    return request<MonitoringSnapshot[]>(`/monitoring/${id}/snapshots?limit=${limit}`);
  },

  async getHealth(): Promise<{ status: string; database: string; uptimeSeconds: number; timestamp: string }> {
    return request<{ status: string; database: string; uptimeSeconds: number; timestamp: string }>('/health');
  },

  async getThreatStats(): Promise<any> {
    return request<any>('/threat-intel/stats');
  },

  async getThreatLogs(params: {
    page?: number;
    limit?: number;
    level?: string;
    category?: string;
    sensorId?: string;
    search?: string;
  } = {}): Promise<any> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.level) q.set('level', params.level);
    if (params.category) q.set('category', params.category);
    if (params.sensorId) q.set('sensorId', params.sensorId);
    if (params.search) q.set('search', params.search);
    return request<any>(`/threat-intel?${q.toString()}`);
  },

  async lookupDomainThreat(domain: string): Promise<any> {
    return request<any>(`/threat-intel/lookup/${encodeURIComponent(domain)}`);
  },

  async seedThreatData(force = false): Promise<any> {
    return request<any>('/threat-intel/seed', {
      method: 'POST',
      body: JSON.stringify({ force })
    });
  },

  async quickLookup(query: string): Promise<{
    query: string;
    domain: string;
    matchedKeyword: boolean;
    ipv4: string[];
    ipv6: string[];
    cnames: string[];
    ptrRecords: Record<string, string[]>;
    totalIps: number;
    responseTimeMs: number;
    resolvedAt: string;
  }> {
    return request<any>(`/quick-lookup?q=${encodeURIComponent(query)}`);
  }
};
