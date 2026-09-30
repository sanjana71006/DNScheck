import { ScanResult } from '@dnscheck/shared';

export function exportScanAsJson(scan: ScanResult): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scan, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `dnscheck-${scan.domain}-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function exportScanAsCsv(scan: ScanResult): void {
  const rows: string[][] = [
    ['DNSCheck Scan Report'],
    ['Domain', scan.domain],
    ['Scan Timestamp', scan.startedAt],
    ['Overall Status', scan.overallStatus],
    ['Propagation Percentage', `${scan.propagationPercentage}%`],
    ['Resolver Agreement', `${scan.resolverAgreement} / ${scan.totalResolversQueried}`],
    [],
    ['Discovered DNS Records'],
    ['Record Type', 'Name', 'Values', 'TTL', 'Source', 'Status', 'Propagation']
  ];

  for (const rec of scan.records) {
    rows.push([
      rec.type,
      rec.name,
      `"${rec.values.join('; ')}"`,
      String(rec.ttl ?? ''),
      rec.source,
      rec.status,
      `${rec.propagationPercentage}%`
    ]);
  }

  rows.push([]);
  rows.push(['Resolver Vantage Observations']);
  rows.push(['Provider', 'IP', 'Location', 'Country', 'Record Type', 'Status', 'Latency (ms)', 'Observed Values', 'Matches Canonical']);

  for (const res of scan.resolverResults) {
    rows.push([
      res.provider,
      res.resolverIp,
      `"${res.locationLabel}"`,
      res.country,
      res.recordType,
      res.status,
      String(res.responseTimeMs),
      `"${res.answers.join('; ')}"`,
      res.matchesCanonical ? 'YES' : 'NO'
    ]);
  }

  rows.push([]);
  rows.push(['Misconfiguration & Security Findings']);
  rows.push(['Severity', 'Category', 'Title', 'Description', 'Evidence', 'Recommendation']);

  for (const f of scan.findings) {
    rows.push([
      f.severity,
      f.category,
      `"${f.title}"`,
      `"${f.description}"`,
      `"${f.evidence}"`,
      `"${f.recommendation}"`
    ]);
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `dnscheck-${scan.domain}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function printScanReport(): void {
  window.print();
}
