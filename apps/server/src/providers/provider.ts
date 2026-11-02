import type { MediaItem } from "@downloader/shared";

// The contract every provider follows. A provider knows ONE site and answers two questions:
//   1. canHandle: "is this link mine?"
//   2. resolve:   "where are the image/video files for this link?"
// Providers never download files themselves. lib/downloader.ts does that for all of them.

/** A media item as a provider finds it (the service adds the download link). */
export type ProviderMediaItem = Omit<MediaItem, "downloadUrl">;

export interface ProviderResult {
  title?: string;
  /** Best quality first. */
  items: ProviderMediaItem[];
}

export interface Provider {
  readonly id: string;
  readonly name: string;
  /** Example link, shown to users. */
  readonly example: string;
  canHandle(url: URL): boolean;
  resolve(url: URL): Promise<ProviderResult>;
}
