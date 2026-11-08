import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UrlValidationError extends Error {}

/** Normalize user input into a canonical absolute http(s) URL. */
export function normalizeUrl(raw: string): string {
  const input = (raw ?? "").trim();
  if (!input) throw new UrlValidationError("Enter a website URL to analyze.");
  if (input.length > 500)
    throw new UrlValidationError("That URL is too long. Please use a shorter address.");
  if (/\s/.test(input))
    throw new UrlValidationError("URLs cannot contain spaces.");

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(input)
    ? input
    : `https://${input}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new UrlValidationError("That does not look like a valid website URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    throw new UrlValidationError("Only http:// and https:// websites can be analyzed.");
  if (parsed.username || parsed.password)
    throw new UrlValidationError("URLs with embedded credentials are not supported.");
  if (parsed.port && !["80", "443"].includes(parsed.port))
    throw new UrlValidationError("Only standard web ports 80 and 443 are supported.");
  if (!parsed.hostname || parsed.hostname.length > 253)
    throw new UrlValidationError("The hostname is invalid.");
  if (
    parsed.hostname.endsWith(".local") ||
    parsed.hostname.endsWith(".internal") ||
    parsed.hostname.endsWith(".localhost") ||
    parsed.hostname === "localhost"
  )
    throw new UrlValidationError("Local and internal network addresses are not allowed.");

  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  if (parsed.pathname === "/") parsed.pathname = "/";
  let result = parsed.toString();
  if (result.endsWith("/") && parsed.pathname === "/" && !parsed.search) {
    result = result.slice(0, -1);
  }
  return result;
}

export function shortUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${parsed.hostname}${path}${parsed.search}`;
  } catch {
    return url;
  }
}

function blockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255))
    return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
  if (a === 203 && b === 0) return true;
  return false;
}

function blockedAddress(ip: string): boolean {
  const normalized = ip.toLowerCase().split("%")[0];
  if (isIP(normalized) === 4) return blockedIpv4(normalized);
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice(7);
    return isIP(mapped) === 4 ? blockedIpv4(mapped) : true;
  }
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80:")) return true;
  return false;
}

/** Resolve DNS and reject private/loopback/link-local targets before every request. */
export async function assertPublicTarget(url: string): Promise<void> {
  const hostname = new URL(url).hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname) && blockedAddress(hostname))
    throw new UrlValidationError("Private network addresses cannot be analyzed.");

  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UrlValidationError(
      "We could not resolve that domain. Check the address and try again.",
    );
  }
  if (!addresses.length)
    throw new UrlValidationError("That domain did not resolve to an address.");
  if (addresses.some((entry) => blockedAddress(entry.address)))
    throw new UrlValidationError(
      "That domain resolves to a private or restricted network address.",
    );
}

export function sameOriginOrPublicRedirect(current: string, location: string): string {
  const next = new URL(location, current).toString();
  const parsed = new URL(next);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    throw new UrlValidationError("Redirects to non-HTTP protocols are blocked.");
  if (parsed.port && !["80", "443"].includes(parsed.port))
    throw new UrlValidationError("Redirects to non-standard ports are blocked.");
  return next;
}
