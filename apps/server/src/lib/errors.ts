// Errors the app throws on purpose. The error handler (plugins/error-handler.ts)
// turns them into JSON responses with the right status code, so routes never need try/catch.

export class AppError extends Error {
  readonly statusCode: number;
  /** Stable, machine-readable code that clients can rely on. */
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** The request itself is wrong (bad input). */
export class BadRequestError extends AppError {
  constructor(message: string, code = "BAD_REQUEST") {
    super(400, code, message);
  }
}

/** The link is valid, but points somewhere we never fetch (private network, odd port, ...). */
export class UrlNotAllowedError extends BadRequestError {
  constructor(message: string) {
    super(message, "URL_NOT_ALLOWED");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, "NOT_FOUND", message);
  }
}

/** No provider knows how to handle this link. */
export class UnsupportedUrlError extends AppError {
  constructor() {
    super(422, "UNSUPPORTED_URL", "This link is not supported yet");
  }
}

/** The file is not an image or video. */
export class UnsupportedMediaError extends AppError {
  constructor(message = "This link does not point to an image or video") {
    super(415, "UNSUPPORTED_MEDIA", message);
  }
}

export class FileTooLargeError extends AppError {
  constructor(maxBytes: number) {
    super(413, "FILE_TOO_LARGE", `The file is larger than the ${Math.round(maxBytes / 1024 / 1024)} MB limit`);
  }
}

/** A download link is broken, tampered with, or expired. */
export class InvalidDownloadLinkError extends AppError {
  constructor(message = "This download link is invalid or has expired") {
    super(403, "INVALID_DOWNLOAD_LINK", message);
  }
}

/** The external site failed or answered with something unexpected. */
export class UpstreamError extends AppError {
  constructor(message: string) {
    super(502, "UPSTREAM_ERROR", message);
  }
}
