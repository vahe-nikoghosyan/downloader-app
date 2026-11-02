// Request/response types of the REST API, shared by the server and every client.

/** Every error response has this shape. */
export interface ApiErrorResponse {
  error: {
    /** Stable, machine-readable code, e.g. "UNSUPPORTED_URL". */
    code: string;
    /** Human-readable explanation, safe to show to users. */
    message: string;
  };
}

// ---------- GET /api/health ----------

export interface HealthResponse {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  timestamp: string;
  services: {
    database: "up" | "down";
  };
}

// ---------- Media ----------

export type MediaType = "image" | "video";

export interface MediaItem {
  type: MediaType;
  /** Quality/variant name when a source offers several, e.g. "original", "large". */
  label?: string;
  /** Direct link to the file at the source. */
  sourceUrl: string;
  /** Link to download the file through our API (relative, e.g. "/api/media/download?token=..."). */
  downloadUrl: string;
  /** Small preview image, when the source provides one. */
  thumbnailUrl?: string;
  filename: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

export interface ProviderInfo {
  id: string;
  name: string;
  /** Example link this provider understands. */
  example: string;
}

/** GET /api/media/providers */
export interface ListProvidersResponse {
  providers: ProviderInfo[];
}

/** POST /api/media/resolve (body) */
export interface ResolveMediaRequest {
  url: string;
}

/** POST /api/media/resolve (response). Items are ordered best quality first. */
export interface ResolveMediaResponse {
  provider: { id: string; name: string };
  title?: string;
  items: MediaItem[];
}

// GET /api/media/download?token=...  streams the file (no JSON body).
