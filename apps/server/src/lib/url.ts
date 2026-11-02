import { BlockList, isIP } from "node:net";
import { BadRequestError, UrlNotAllowedError } from "./errors.js";

// Parses a link typed by a user. Adds "https://" when the scheme is missing.
export function parseUserUrl(input: string): URL {
  const text = input.trim();
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(text) ? text : `https://${text}`;

  try {
    return new URL(withScheme);
  } catch {
    throw new BadRequestError("This is not a valid link", "INVALID_URL");
  }
}

// ---------- SSRF protection ----------
// The server fetches links that users send. Without these checks, someone could make it
// request internal addresses (the database, cloud metadata at 169.254.169.254, ...).

// Address ranges that are never reachable from the public internet.
const privateRanges = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
] as const) {
  privateRanges.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128], // unspecified
  ["::1", 128], // loopback
  ["::ffff:0:0", 96], // IPv4-mapped (could hide a private IPv4 address)
  ["fc00::", 7], // unique local (private)
  ["fe80::", 10], // link-local
  ["ff00::", 8], // multicast
] as const) {
  privateRanges.addSubnet(network, prefix, "ipv6");
}

/** True only for addresses on the public internet. */
export function isPublicIp(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return false;
  return !privateRanges.check(address, family === 4 ? "ipv4" : "ipv6");
}

const internalHostSuffixes = [".localhost", ".local", ".internal", ".lan", ".home.arpa"];

// Checks a URL before every request (including each redirect).
// Hostnames are checked again at connection time, after DNS lookup (see lib/http.ts).
export function assertSafeUrl(url: URL): void {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UrlNotAllowedError("Only http and https links are supported");
  }
  if (url.username || url.password) {
    throw new UrlNotAllowedError("Links with a username or password are not allowed");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new UrlNotAllowedError("Only links on standard ports (80, 443) are allowed");
  }

  // "[::1]" → "::1", and "example.com." → "example.com"
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();

  if (isIP(host) ? !isPublicIp(host) : isInternalHostname(host)) {
    throw new UrlNotAllowedError("Links to private or local network addresses are not allowed");
  }
}

function isInternalHostname(host: string): boolean {
  return host === "localhost" || !host.includes(".") || internalHostSuffixes.some((suffix) => host.endsWith(suffix));
}
