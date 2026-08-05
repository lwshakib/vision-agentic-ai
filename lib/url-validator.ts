import dns from 'dns/promises';
import net from 'net';

// Regex patterns for private/restricted IPv4 address ranges
const PRIVATE_IPV4_PATTERNS = [
  /^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 0.0.0.0/8 (Current network)
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.0.0.0/8 (Private network)
  /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/, // 100.64.0.0/10 (Carrier-grade NAT)
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 127.0.0.0/8 (Loopback)
  /^169\.254\.\d{1,3}\.\d{1,3}$/, // 169.254.0.0/16 (Link-local & AWS IMDS 169.254.169.254)
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12 (Private network)
  /^192\.0\.0\.\d{1,3}$/, // 192.0.0.0/24 (IETF Protocol Assignments)
  /^192\.0\.2\.\d{1,3}$/, // 192.0.2.0/24 (TEST-NET-1)
  /^192\.88\.99\.\d{1,3}$/, // 192.88.99.0/24 (6to4 Relay Anycast)
  /^192\.168\.\d{1,3}\.\d{1,3}$/, // 192.168.0.0/16 (Private network)
  /^198\.1[89]\.\d{1,3}\.\d{1,3}$/, // 198.18.0.0/15 (Benchmarking)
  /^198\.51\.100\.\d{1,3}$/, // 198.51.100.0/24 (TEST-NET-2)
  /^203\.0\.113\.\d{1,3}$/, // 203.0.113.0/24 (TEST-NET-3)
  /^(22[4-9]|23\d)\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 224.0.0.0/4 (Multicast)
  /^(24\d|25[0-5])\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 240.0.0.0/4 (Reserved/Broadcast)
];

// Regex patterns for private/restricted IPv6 address ranges
const PRIVATE_IPV6_PATTERNS = [
  /^::$/, // Unspecified
  /^::1$/, // Loopback
  /^(0:){7}0?1$/, // Loopback expanded
  /^(0:){7}0?0$/, // Unspecified expanded
  /^::ffff:(127\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.|169\.254\.|0\.)/i, // IPv4-mapped private
  /^f[cd][0-9a-f]{2}:/i, // fc00::/7 (Unique local)
  /^fe[89ab][0-9a-f]:/i, // fe80::/10 (Link-local)
  /^ff[0-9a-f]{2}:/i, // ff00::/8 (Multicast)
  /^2001:0?db8:/i, // 2001:db8::/32 (Documentation)
];

// Regex pattern for forbidden local/internal hostnames
const FORBIDDEN_HOSTNAME_REGEX =
  /^(localhost|.*\.local|.*\.internal|.*\.lan)$/i;

// Regex pattern for HTTP / HTTPS protocol scheme
const HTTP_HTTPS_SCHEME_REGEX = /^https?:\/\//i;

/**
 * Checks if an IPv4 address matches any private or restricted range regex pattern.
 */
export function isPrivateIPv4(ip: string): boolean {
  return PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(ip));
}

/**
 * Checks if an IPv6 address matches any private or restricted range regex pattern.
 */
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();
  return PRIVATE_IPV6_PATTERNS.some((pattern) => pattern.test(normalized));
}

export interface URLValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates a URL for SSRF security using Regex and DNS verification.
 * Returns { valid: true } if URL uses http/https scheme and points to a public IP address.
 */
export async function validatePublicUrl(
  urlString: string,
): Promise<URLValidationResult> {
  try {
    // 1. Verify scheme using Regex
    if (!HTTP_HTTPS_SCHEME_REGEX.test(urlString)) {
      return {
        valid: false,
        reason:
          'Forbidden URL scheme (only http:// and https:// are allowed)',
      };
    }

    const parsedUrl = new URL(urlString);
    const hostname = parsedUrl.hostname.toLowerCase();

    // 2. Reject internal hostnames using Regex
    if (FORBIDDEN_HOSTNAME_REGEX.test(hostname)) {
      return {
        valid: false,
        reason: `Forbidden internal hostname: ${hostname}`,
      };
    }

    // 3. Check direct IP address hostnames using Regex
    if (net.isIP(hostname)) {
      if (net.isIPv4(hostname) && isPrivateIPv4(hostname)) {
        return {
          valid: false,
          reason: `Private or internal IPv4 address blocked: ${hostname}`,
        };
      }
      if (net.isIPv6(hostname) && isPrivateIPv6(hostname)) {
        return {
          valid: false,
          reason: `Private or internal IPv6 address blocked: ${hostname}`,
        };
      }
      return { valid: true };
    }

    // 4. DNS resolution to check underlying IP addresses against private Regex patterns
    let addresses: Array<{ address: string; family: number }>;
    try {
      addresses = await dns.lookup(hostname, { all: true });
    } catch {
      return {
        valid: false,
        reason: `Could not resolve hostname: ${hostname}`,
      };
    }

    if (!addresses || addresses.length === 0) {
      return {
        valid: false,
        reason: `Could not resolve hostname: ${hostname}`,
      };
    }

    for (const addr of addresses) {
      if (addr.family === 4 && isPrivateIPv4(addr.address)) {
        return {
          valid: false,
          reason: `Hostname ${hostname} resolved to private IPv4 address ${addr.address}`,
        };
      }
      if (addr.family === 6 && isPrivateIPv6(addr.address)) {
        return {
          valid: false,
          reason: `Hostname ${hostname} resolved to private IPv6 address ${addr.address}`,
        };
      }
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : 'Invalid URL format',
    };
  }
}
