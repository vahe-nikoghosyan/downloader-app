import type { MediaItem, ResolveMediaResponse } from "@downloader/shared";
import { config } from "../../config.js";
import { createDownloadToken, readDownloadToken } from "../../lib/download-token.js";
import { openDownload, type Download } from "../../lib/downloader.js";
import { NotFoundError, UnsupportedUrlError } from "../../lib/errors.js";
import { assertSafeUrl, parseUserUrl } from "../../lib/url.js";
import { findProvider } from "../../providers/registry.js";
import type { ProviderMediaItem } from "../../providers/provider.js";

// The media use cases, step by step. No HTTP details here (that's the routes' job),
// so the same functions can serve the web app, the Telegram bot, or a background job.

/** Link in → list of images/videos found at that link. */
export async function resolveMedia(input: string): Promise<ResolveMediaResponse> {
  const url = parseUserUrl(input);
  assertSafeUrl(url);

  const provider = findProvider(url);
  if (!provider) throw new UnsupportedUrlError();

  const result = await provider.resolve(url);
  if (result.items.length === 0) throw new NotFoundError("No images or videos were found at this link");

  return {
    provider: { id: provider.id, name: provider.name },
    title: result.title,
    items: result.items.map(withDownloadUrl),
  };
}

/** Download token → file stream from the source. */
export async function downloadMedia(token: string): Promise<Download & { filename: string }> {
  const target = readDownloadToken(token, config.downloadTokenSecret);
  const download = await openDownload(new URL(target.url), config.maxDownloadBytes);
  return { ...download, filename: target.filename };
}

function withDownloadUrl(item: ProviderMediaItem): MediaItem {
  const token = createDownloadToken({ url: item.sourceUrl, filename: item.filename }, config.downloadTokenSecret);
  return { ...item, downloadUrl: `/api/media/download?token=${token}` };
}
