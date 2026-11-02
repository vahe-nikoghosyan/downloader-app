import { z } from "zod";
import { NotFoundError, UnsupportedMediaError } from "../lib/errors.js";
import { filenameFromUrl, safeDecode } from "../lib/files.js";
import { fetchJson } from "../lib/http.js";
import type { Provider } from "./provider.js";

// File pages on Wikimedia Commons and Wikipedia, e.g.
//   https://commons.wikimedia.org/wiki/File:Example.jpg
//   https://en.wikipedia.org/wiki/Apollo_11#/media/File:Example.jpg
// Uses the public MediaWiki API: https://www.mediawiki.org/wiki/API:Imageinfo

const WIKIMEDIA_HOST = /(^|\.)(wikimedia|wikipedia)\.org$/;

const imageInfoResponse = z.object({
  query: z.object({
    pages: z.array(
      z.object({
        title: z.string(),
        missing: z.boolean().optional(),
        imageinfo: z
          .array(
            z.object({
              url: z.url(),
              mime: z.string(),
              width: z.number().optional(),
              height: z.number().optional(),
              size: z.number().optional(),
              thumburl: z.url().optional(),
            }),
          )
          .optional(),
      }),
    ),
  }),
});

export const wikimediaProvider: Provider = {
  id: "wikimedia",
  name: "Wikimedia Commons / Wikipedia",
  example: "https://commons.wikimedia.org/wiki/File:The_Earth_seen_from_Apollo_17.jpg",

  canHandle(url) {
    return WIKIMEDIA_HOST.test(url.hostname) && getFileTitle(url) !== undefined;
  },

  async resolve(url) {
    const title = getFileTitle(url);
    if (!title) return { items: [] };

    const data = await fetchJson(buildApiUrl(url.hostname, title), imageInfoResponse);
    const page = data.query.pages[0];
    const info = page?.imageinfo?.[0];
    if (!page || page.missing || !info) throw new NotFoundError("This file does not exist on Wikimedia");

    const type = info.mime.startsWith("video/") ? "video" : info.mime.startsWith("image/") ? "image" : undefined;
    if (!type) throw new UnsupportedMediaError(`This file is not an image or video (${info.mime})`);

    const fileUrl = new URL(info.url);
    return {
      title: page.title.replace(/^File:/, ""),
      items: [
        {
          type,
          label: "original",
          sourceUrl: fileUrl.href,
          thumbnailUrl: info.thumburl,
          filename: filenameFromUrl(fileUrl),
          mimeType: info.mime,
          width: info.width,
          height: info.height,
          sizeBytes: info.size,
        },
      ],
    };
  },
};

/** "File:Example.jpg", from the page path or from a "#/media/File:..." viewer link. */
function getFileTitle(url: URL): string | undefined {
  const raw = /^#\/media\/(File:.+)$/.exec(url.hash)?.[1] ?? /^\/wiki\/(File:.+)$/.exec(url.pathname)?.[1];
  return raw ? safeDecode(raw).replaceAll("_", " ") : undefined;
}

function buildApiUrl(hostname: string, title: string): URL {
  // Mobile hosts (en.m.wikipedia.org) serve the same API on the desktop host.
  const apiUrl = new URL(`https://${hostname.replace(".m.", ".")}/w/api.php`);
  apiUrl.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "imageinfo",
    iiprop: "url|size|mime",
    iiurlwidth: "640", // also return a 640px-wide thumbnail
    titles: title,
  }).toString();
  return apiUrl;
}
