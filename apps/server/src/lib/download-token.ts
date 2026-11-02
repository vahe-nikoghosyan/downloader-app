import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { InvalidDownloadLinkError } from "./errors.js";

// Download links carry a signed token instead of a raw URL.
// Only files that one of our providers resolved can be downloaded, so the server
// can't be used as an open proxy for any URL on the internet. No database needed.

const TOKEN_TTL_SECONDS = 60 * 60; // links stay valid for 1 hour

const payloadSchema = z.object({
  url: z.url(),
  filename: z.string(),
  exp: z.number(), // expiry, unix seconds
});

export interface DownloadTarget {
  url: string;
  filename: string;
}

export function createDownloadToken(target: DownloadTarget, secret: string): string {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ ...target, exp })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function readDownloadToken(token: string, secret: string): DownloadTarget {
  const [payload = "", signature = ""] = token.split(".");

  if (!isValidSignature(payload, signature, secret)) throw new InvalidDownloadLinkError();

  const parsed = payloadSchema.safeParse(parseJson(Buffer.from(payload, "base64url").toString("utf8")));
  if (!parsed.success) throw new InvalidDownloadLinkError();
  if (parsed.data.exp < Date.now() / 1000) throw new InvalidDownloadLinkError("This download link has expired");

  return { url: parsed.data.url, filename: parsed.data.filename };
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function isValidSignature(payload: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  // Constant-time comparison, so the signature can't be guessed byte by byte.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
