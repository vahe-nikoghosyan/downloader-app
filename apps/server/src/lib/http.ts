import { lookup } from "node:dns";
import type { LookupFunction } from "node:net";
import { Agent, ProxyAgent, fetch, type Dispatcher, type Response } from "undici";
import type { z } from "zod";
import { config } from "../config.js";
import { NotFoundError, UpstreamError, UrlNotAllowedError } from "./errors.js";
import { assertSafeUrl, isPublicIp } from "./url.js";

// The only way the app talks to external sites. Every request gets:
// - SSRF protection (URL checks + checking the real IP after DNS lookup)
// - timeouts, a redirect limit, and an identifying User-Agent

const USER_AGENT = "DownloaderApp/0.1 (+https://github.com/vahe-nikoghosyan/downloader-app)";
const MAX_REDIRECTS = 5;

class PrivateAddressError extends Error {}

// DNS lookup that refuses to connect to private addresses. Running it at connection time
// also blocks "DNS rebinding" (a hostname that resolves to a public IP first, a private one later).
const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);

    if (addresses.some((entry) => !isPublicIp(entry.address))) {
      return callback(new PrivateAddressError(hostname), "", 0);
    }
    if (options.all) return callback(null, addresses);

    const [first] = addresses;
    return first ? callback(null, first.address, first.family) : callback(new Error(`No address for ${hostname}`), "", 0);
  });
};

const timeouts = {
  headersTimeout: 15_000, // max wait for the response to start
  bodyTimeout: 30_000, // max silence between two chunks of the body
};

// With an outbound proxy, the proxy does DNS, so it should enforce its own egress rules.
const dispatcher: Dispatcher = config.outboundProxyUrl
  ? new ProxyAgent({ uri: config.outboundProxyUrl, ...timeouts })
  : new Agent({ ...timeouts, connect: { lookup: publicOnlyLookup } });

/** fetch() with SSRF protection. Follows redirects manually so every hop is checked. */
export async function safeFetch(url: URL, headers: Record<string, string> = {}): Promise<Response> {
  let current = url;

  for (let redirects = 0; ; redirects++) {
    assertSafeUrl(current);
    const response = await send(current, headers);

    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) return response;

    await response.body?.cancel();
    if (redirects >= MAX_REDIRECTS) throw new UpstreamError("The link redirects too many times");
    current = new URL(location, current);
  }
}

async function send(url: URL, headers: Record<string, string>): Promise<Response> {
  try {
    return await fetch(url, {
      headers: { "user-agent": USER_AGENT, ...headers },
      redirect: "manual",
      dispatcher,
    });
  } catch (error) {
    if (error instanceof Error && error.cause instanceof PrivateAddressError) {
      throw new UrlNotAllowedError("Links to private or local network addresses are not allowed");
    }
    throw new UpstreamError(`Could not reach ${url.hostname}`);
  }
}

/** Fetches JSON and validates its shape, so providers never work with unexpected data. */
export async function fetchJson<T>(url: URL, schema: z.ZodType<T>): Promise<T> {
  const response = await safeFetch(url, { accept: "application/json" });

  if (response.status === 404) throw new NotFoundError("Nothing was found at this link");
  if (!response.ok) throw new UpstreamError(`${url.hostname} answered with HTTP ${response.status}`);

  const parsed = schema.safeParse(await response.json().catch(() => undefined));
  if (!parsed.success) throw new UpstreamError(`Unexpected response from ${url.hostname}`);
  return parsed.data;
}
