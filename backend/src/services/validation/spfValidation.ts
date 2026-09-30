import { Finding } from '../../shared/index.js';
import net from 'net';

export interface SPFValidationResult {
  status: 'VALID' | 'WARNING' | 'ERROR' | 'MISSING';
  records: string[];
  findings: Finding[];
  details: string;
  allMechanism?: string;
  lookupCount: number;
}

export class SPFValidation {
  public static validate(txtRecords: string[]): SPFValidationResult {
    const findings: Finding[] = [];
    const spfRecords = (txtRecords || []).filter((r) => r.trim().startsWith('v=spf1'));

    if (spfRecords.length === 0) {
      findings.push({
        severity: 'WARNING',
        category: 'SECURITY_SPF',
        title: 'Missing SPF Record',
        description: 'No Sender Policy Framework (SPF) record was detected in the domain TXT records.',
        evidence: 'No TXT record starting with "v=spf1"',
        recommendation:
          'Publish a valid SPF record (e.g. "v=spf1 -all" or include authorized email relays) to prevent unauthorized senders from spoofing your domain.',
        createdAt: new Date().toISOString()
      });

      return {
        status: 'MISSING',
        records: [],
        findings,
        details: 'No SPF record detected. Domain is vulnerable to email spoofing.',
        lookupCount: 0
      };
    }

    // Check multiple SPF records (RFC 7208 violation)
    if (spfRecords.length > 1) {
      findings.push({
        severity: 'CRITICAL',
        category: 'SECURITY_SPF',
        title: 'Multiple SPF Records Detected',
        description:
          'RFC 7208 section 3.2 explicitly dictates that a domain MUST NOT have more than one SPF record. Receiving mail transfer agents will return a PermError.',
        evidence: `Found ${spfRecords.length} records: ${spfRecords.join(' | ')}`,
        recommendation:
          'Merge all authorized sending servers and includes into a single authoritative "v=spf1" TXT record.',
        createdAt: new Date().toISOString()
      });

      return {
        status: 'ERROR',
        records: spfRecords,
        findings,
        details: `RFC 7208 PermError: Domain publishes ${spfRecords.length} SPF records. Only one record is allowed.`,
        lookupCount: 0
      };
    }

    const record = spfRecords[0].trim();
    const tokens = record.split(/\s+/).slice(1); // strip v=spf1

    let lookupCount = 0;
    let allMechanism: string | undefined;
    let hasSyntaxError = false;

    for (const token of tokens) {
      const lower = token.toLowerCase();

      // Check all mechanism
      if (/^[-+~?]?all$/.test(lower)) {
        allMechanism = lower;
        if (lower === '+all' || lower === 'all') {
          findings.push({
            severity: 'CRITICAL',
            category: 'SECURITY_SPF',
            title: 'Permissive SPF Policy (+all)',
            description:
              'The SPF record specifies "+all", allowing ANY IP address in the world to legitimately send email as your domain.',
            evidence: record,
            recommendation: 'Change "+all" to "-all" (hard fail) or "~all" (soft fail).',
            createdAt: new Date().toISOString()
          });
        }
        continue;
      }

      // Check includes
      if (lower.startsWith('include:')) {
        lookupCount++;
        const target = token.substring(8);
        if (!target || target.includes(' ')) {
          hasSyntaxError = true;
          findings.push({
            severity: 'CRITICAL',
            category: 'SECURITY_SPF',
            title: 'Malformed SPF Include',
            description: `The include mechanism "${token}" specifies an invalid target domain.`,
            evidence: token,
            recommendation: 'Ensure the include target is a valid fully qualified domain name.',
            createdAt: new Date().toISOString()
          });
        }
        continue;
      }

      // Check ip4
      if (lower.startsWith('ip4:')) {
        const ipStr = token.substring(4);
        const [ip, cidr] = ipStr.split('/');
        if (!net.isIPv4(ip) || (cidr && (parseInt(cidr, 10) < 0 || parseInt(cidr, 10) > 32))) {
          hasSyntaxError = true;
          findings.push({
            severity: 'CRITICAL',
            category: 'SECURITY_SPF',
            title: 'Invalid IPv4 in SPF Record',
            description: `The mechanism "${token}" contains an invalid IPv4 address or CIDR mask.`,
            evidence: token,
            recommendation: 'Verify and fix the IPv4 address or subnet mask in your SPF record.',
            createdAt: new Date().toISOString()
          });
        }
        continue;
      }

      // Check ip6
      if (lower.startsWith('ip6:')) {
        const ipStr = token.substring(4);
        const [ip, cidr] = ipStr.split('/');
        if (!net.isIPv6(ip) || (cidr && (parseInt(cidr, 10) < 0 || parseInt(cidr, 10) > 128))) {
          hasSyntaxError = true;
          findings.push({
            severity: 'CRITICAL',
            category: 'SECURITY_SPF',
            title: 'Invalid IPv6 in SPF Record',
            description: `The mechanism "${token}" contains an invalid IPv6 address or CIDR mask.`,
            evidence: token,
            recommendation: 'Verify and fix the IPv6 address or subnet mask in your SPF record.',
            createdAt: new Date().toISOString()
          });
        }
        continue;
      }

      // Check a or mx mechanism
      if (/^[-+~?]?(a|mx)(:[^\s]+)?(\/\d+)?$/.test(lower)) {
        lookupCount++;
        continue;
      }

      // Check redirect
      if (lower.startsWith('redirect=')) {
        lookupCount++;
        continue;
      }

      // Check exists
      if (lower.startsWith('exists:')) {
        lookupCount++;
        continue;
      }

      // Check ptr mechanism (deprecated in RFC 7208)
      if (lower.startsWith('ptr') || lower.startsWith('-ptr') || lower.startsWith('~ptr')) {
        findings.push({
          severity: 'WARNING',
          category: 'SECURITY_SPF',
          title: 'Deprecated PTR Mechanism in SPF',
          description:
            'RFC 7208 Section 5.5 explicitly discourages the use of "ptr" mechanisms as they cause significant latency and unreliable reverse DNS queries.',
          evidence: token,
          recommendation: 'Replace "ptr" mechanisms with explicit "ip4" or "ip6" CIDR ranges.',
          createdAt: new Date().toISOString()
        });
        continue;
      }

      // Unknown mechanism
      hasSyntaxError = true;
      findings.push({
        severity: 'WARNING',
        category: 'SECURITY_SPF',
        title: 'Unrecognized SPF Mechanism',
        description: `Unrecognized mechanism "${token}" in SPF record.`,
        evidence: token,
        recommendation: 'Remove or correct unsupported SPF syntax.',
        createdAt: new Date().toISOString()
      });
    }

    // Check lookup count
    if (lookupCount > 10) {
      findings.push({
        severity: 'CRITICAL',
        category: 'SECURITY_SPF',
        title: 'SPF DNS Lookup Limit Exceeded',
        description: `RFC 7208 imposes a strict limit of 10 DNS lookups during SPF evaluation. Current record requires at least ${lookupCount} lookups.`,
        evidence: `Direct lookups: ${lookupCount}`,
        recommendation: 'Flatten your SPF record using IP ranges or consolidate redundant includes.',
        createdAt: new Date().toISOString()
      });
    }

    if (!allMechanism) {
      findings.push({
        severity: 'WARNING',
        category: 'SECURITY_SPF',
        title: 'Missing SPF Default Policy Mechanism',
        description: 'SPF record does not specify an "all" fallback mechanism (e.g. "-all" or "~all").',
        evidence: record,
        recommendation: 'Append "-all" (hard fail) or "~all" (soft fail) to enforce strict policy.',
        createdAt: new Date().toISOString()
      });
    }

    const status = hasSyntaxError || lookupCount > 10 ? 'ERROR' : findings.length > 0 ? 'WARNING' : 'VALID';

    return {
      status,
      records: spfRecords,
      findings,
      details: `SPF syntax valid with policy: ${allMechanism || 'none'}, estimated lookups: ${lookupCount}`,
      allMechanism,
      lookupCount
    };
  }
}
