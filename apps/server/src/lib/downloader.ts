import { Readable, Transform, pipeline } from "node:stream";
import type { ReadableStream } from "node:stream/web";
import { FileTooLargeError, NotFoundError, UnsupportedMediaError, UpstreamError } from "./errors.js";
import { safeFetch } from "./http.js";

export interface Download {
  /** File contents, streamed: data is passed on as it arrives, never fully held in memory. */
  stream: Readable;
  contentType: string;
  /** Size in bytes, when the source tells us. */
  contentLength?: number;
}

const ALLOWED_CONTENT_TYPES = /^(image|video)\//;

// Opens a download from a source URL. Shared by every provider,
// so limits and checks are written once.
export async function openDownload(url: URL, maxBytes: number): Promise<Download> {
  const response = await safeFetch(url);

  if (response.status === 404) throw new NotFoundError("The file no longer exists at the source");
  if (!response.ok || !response.body) throw new UpstreamError(`${url.hostname} answered with HTTP ${response.status}`);

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  const contentLength = parseContentLength(response.headers.get("content-length"));

  if (!ALLOWED_CONTENT_TYPES.test(contentType)) {
    await response.body.cancel();
    throw new UnsupportedMediaError();
  }
  if (contentLength !== undefined && contentLength > maxBytes) {
    await response.body.cancel();
    throw new FileTooLargeError(maxBytes);
  }

  // Also enforce the limit while streaming, in case the source did not send (or lied about) the size.
  const limiter = byteLimit(maxBytes);
  pipeline(Readable.fromWeb(response.body as ReadableStream), limiter, () => {
    // Errors reach whoever consumes `limiter`; when the client disconnects, the source is cancelled too.
  });

  return { stream: limiter, contentType, contentLength };
}

function parseContentLength(value: string | null): number | undefined {
  const length = Number(value);
  return value && Number.isSafeInteger(length) && length >= 0 ? length : undefined;
}

/** Passes data through, but fails once more than `maxBytes` went by. */
function byteLimit(maxBytes: number): Transform {
  let received = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      callback(received > maxBytes ? new FileTooLargeError(maxBytes) : null, chunk);
    },
  });
}
