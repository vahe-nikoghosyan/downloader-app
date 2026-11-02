import { z } from "zod";
import type { MediaType } from "@downloader/shared";
import { NotFoundError, UnsupportedMediaError } from "../lib/errors.js";
import { filenameFromUrl, formatFromName, safeDecode } from "../lib/files.js";
import { fetchJson } from "../lib/http.js";
import type { Provider, ProviderMediaItem } from "./provider.js";

// NASA Image and Video Library (public domain), e.g. https://images.nasa.gov/details/as11-40-5874
// Uses the public API: https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf

const API_BASE = "https://images-api.nasa.gov";

// NASA stores each file in several sizes, marked in the file name: "as11-40-5874~orig.jpg".
const QUALITIES = ["orig", "large", "medium", "small"] as const;
const QUALITY_LABELS: Record<(typeof QUALITIES)[number], string> = {
  orig: "original",
  large: "large",
  medium: "medium",
  small: "small",
};

const assetResponse = z.object({
  collection: z.object({ items: z.array(z.object({ href: z.string() })) }),
});

const searchResponse = z.object({
  collection: z.object({
    items: z.array(z.object({ data: z.array(z.object({ title: z.string().optional(), media_type: z.string() })) })),
  }),
});

export const nasaProvider: Provider = {
  id: "nasa",
  name: "NASA Image and Video Library",
  example: "https://images.nasa.gov/details/as11-40-5874",

  canHandle(url) {
    return getNasaId(url) !== undefined;
  },

  async resolve(url) {
    const nasaId = getNasaId(url);
    if (!nasaId) return { items: [] };

    // Two independent requests, run in parallel: the file list and the title/type.
    const [asset, search] = await Promise.all([
      fetchJson(new URL(`${API_BASE}/asset/${encodeURIComponent(nasaId)}`), assetResponse),
      fetchJson(new URL(`${API_BASE}/search?nasa_id=${encodeURIComponent(nasaId)}`), searchResponse),
    ]);

    const metadata = search.collection.items[0]?.data[0];
    if (!metadata) throw new NotFoundError("This item does not exist in the NASA library");
    if (metadata.media_type !== "image" && metadata.media_type !== "video") {
      throw new UnsupportedMediaError(`NASA ${metadata.media_type} files are not supported`);
    }

    const fileUrls = asset.collection.items.map((item) => toHttpsUrl(item.href));
    return {
      title: metadata.title,
      items: pickRenditions(fileUrls, metadata.media_type, findThumbnail(fileUrls)),
    };
  },
};

/** "https://images.nasa.gov/details/as11-40-5874" (or the older "/details-as11-40-5874") → "as11-40-5874" */
function getNasaId(url: URL): string | undefined {
  if (url.hostname !== "images.nasa.gov") return undefined;
  const match = /^\/details[/-]([^/]+?)(?:\.html)?\/?$/.exec(url.pathname);
  return match?.[1] ? safeDecode(match[1]) : undefined;
}

/** One item per available quality, best first. */
function pickRenditions(fileUrls: URL[], type: MediaType, thumbnailUrl?: string): ProviderMediaItem[] {
  const items: ProviderMediaItem[] = [];

  for (const quality of QUALITIES) {
    const fileUrl = fileUrls.find((url) => url.pathname.includes(`~${quality}.`) && formatFromName(url.pathname)?.type === type);
    if (!fileUrl) continue;

    items.push({
      type,
      label: QUALITY_LABELS[quality],
      sourceUrl: fileUrl.href,
      thumbnailUrl,
      filename: filenameFromUrl(fileUrl),
      mimeType: formatFromName(fileUrl.pathname)?.mimeType,
    });
  }
  return items;
}

function findThumbnail(fileUrls: URL[]): string | undefined {
  return fileUrls.find((url) => url.pathname.includes("~thumb.") && formatFromName(url.pathname)?.type === "image")?.href;
}

/** The API sometimes returns http:// links and unencoded spaces. */
function toHttpsUrl(href: string): URL {
  return new URL(href.replace(/^http:\/\//, "https://"));
}
