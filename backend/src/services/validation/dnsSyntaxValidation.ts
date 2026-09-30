import net from 'net';

export class DNSSyntaxValidation {
  /**
   * Safely normalizes input by stripping protocol (http://, https://), port, and path
   */
  public static cleanDomainInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    return input
      .trim()
      .toLowerCase()
      .replace(/^[a-zA-Z]+:\/\//, '') // strip protocol
      .split('/')[0] // strip path
      .split(':')[0] // strip port
      .replace(/\.+$/, ''); // strip trailing dot
  }

  public static isValidDomain(domain: string): { valid: boolean; reason?: string; cleanedDomain?: string } {
    if (!domain || typeof domain !== 'string') {
      return { valid: false, reason: 'Domain name is required.' };
    }

    const clean = this.cleanDomainInput(domain);

    if (clean.length === 0) {
      return { valid: false, reason: 'Domain name cannot be empty.' };
    }

    if (clean.length > 253) {
      return { valid: false, reason: 'Domain name exceeds maximum length of 253 characters (RFC 1035).' };
    }

    const labels = clean.split('.');
    if (labels.length < 2) {
      return { valid: false, reason: 'Domain name must have at least one subdomain or domain and a TLD.' };
    }

    for (const label of labels) {
      if (label.length === 0) {
        return { valid: false, reason: 'Domain contains consecutive dots or empty labels.' };
      }
      if (label.length > 63) {
        return { valid: false, reason: `Label "${label}" exceeds maximum length of 63 characters.` };
      }
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label)) {
        return {
          valid: false,
          reason: `Label "${label}" contains invalid characters or starts/ends with a hyphen.`
        };
      }
    }

    const tld = labels[labels.length - 1];
    if (/^\d+$/.test(tld)) {
      return { valid: false, reason: 'TLD cannot be purely numeric.' };
    }

    return { valid: true, cleanedDomain: clean };
  }

  public static isValidIPv4(ip: string): boolean {
    return net.isIPv4(ip.trim());
  }

  public static isValidIPv6(ip: string): boolean {
    return net.isIPv6(ip.trim());
  }

  public static isValidHostname(hostname: string): boolean {
    const clean = this.cleanDomainInput(hostname);
    if (!clean || clean.length > 253) return false;
    const labels = clean.split('.');
    for (const label of labels) {
      if (!label || label.length > 63) return false;
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label)) return false;
    }
    return true;
  }
}
