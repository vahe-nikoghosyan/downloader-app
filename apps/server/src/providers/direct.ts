import { filenameFromUrl, formatFromName } from "../lib/files.js";
import type { Provider } from "./provider.js";

// Any public link that points straight to an image or video file, e.g. https://example.com/photo.jpg
// No API call needed: the link already is the file. The downloader checks the real content type.
export const directProvider: Provider = {
  id: "direct",
  name: "Direct file link",
  example: "https://upload.wikimedia.org/wikipedia/commons/9/97/The_Earth_seen_from_Apollo_17.jpg",

  canHandle(url) {
    return formatFromName(url.pathname) !== undefined;
  },

  async resolve(url) {
    const format = formatFromName(url.pathname);
    if (!format) return { items: [] };

    return {
      items: [
        {
          type: format.type,
          sourceUrl: url.href,
          thumbnailUrl: format.type === "image" ? url.href : undefined,
          filename: filenameFromUrl(url),
          mimeType: format.mimeType,
        },
      ],
    };
  },
};
