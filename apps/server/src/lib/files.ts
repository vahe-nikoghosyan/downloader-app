import type { MediaType } from "@downloader/shared";

interface KnownFormat {
  type: MediaType;
  mimeType: string;
}

const formatsByExtension: Record<string, KnownFormat> = {
  jpg: { type: "image", mimeType: "image/jpeg" },
  jpeg: { type: "image", mimeType: "image/jpeg" },
  png: { type: "image", mimeType: "image/png" },
  gif: { type: "image", mimeType: "image/gif" },
  webp: { type: "image", mimeType: "image/webp" },
  avif: { type: "image", mimeType: "image/avif" },
  tif: { type: "image", mimeType: "image/tiff" },
  tiff: { type: "image", mimeType: "image/tiff" },
  mp4: { type: "video", mimeType: "video/mp4" },
  webm: { type: "video", mimeType: "video/webm" },
  mov: { type: "video", mimeType: "video/quicktime" },
};

/** "photo.JPG" → "jpg" */
export function getExtension(pathOrName: string): string {
  const match = /\.([a-z\d]+)$/i.exec(pathOrName);
  return match?.[1]?.toLowerCase() ?? "";
}

/** Image/video format for a file name or URL path, or undefined if it isn't one we support. */
export function formatFromName(pathOrName: string): KnownFormat | undefined {
  return formatsByExtension[getExtension(pathOrName)];
}

/** Last segment of the URL path, decoded and made safe. */
export function filenameFromUrl(url: URL, fallback = "download"): string {
  const lastSegment = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  return sanitizeFilename(safeDecode(lastSegment)) || fallback;
}

/** Removes characters that are unsafe in file names (paths, quotes, control characters). */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[\u0000-\u001f\u007f"\\/:*?<>|]+/g, "_")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 150);
}

/** Content-Disposition header that makes browsers save the file under `filename`. */
export function attachmentHeader(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
