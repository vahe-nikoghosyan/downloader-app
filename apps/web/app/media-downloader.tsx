"use client";

import { useState, type FormEvent } from "react";
import type { MediaItem, ResolveMediaResponse } from "@downloader/shared";
import { readApiError } from "@/lib/api";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; result: ResolveMediaResponse };

// Client Component: form input, loading state and results need the browser.
export function MediaDownloader() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/media/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) return setState({ status: "error", message: await readApiError(response) });

      setState({ status: "done", result: (await response.json()) as ResolveMediaResponse });
    } catch {
      setState({ status: "error", message: "Could not reach the server" });
    }
  }

  return (
    <div>
      <form className="url-form" onSubmit={handleSubmit}>
        <input
          type="text"
          inputMode="url"
          placeholder="Paste a link to an image or video"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          required
        />
        <button type="submit" disabled={state.status === "loading"}>
          {state.status === "loading" ? "Searching…" : "Find media"}
        </button>
      </form>

      {state.status === "error" && <p className="error">{state.message}</p>}
      {state.status === "done" && <Result result={state.result} />}
    </div>
  );
}

function Result({ result }: { result: ResolveMediaResponse }) {
  return (
    <section className="result">
      <p className="muted">
        {result.provider.name}
        {result.title && ` · ${result.title}`}
      </p>
      <ul className="items">
        {result.items.map((item) => (
          <MediaRow key={item.downloadUrl} item={item} />
        ))}
      </ul>
    </section>
  );
}

function MediaRow({ item }: { item: MediaItem }) {
  const details = [
    item.label,
    item.width && item.height ? `${item.width}×${item.height}` : undefined,
    item.sizeBytes ? formatBytes(item.sizeBytes) : undefined,
  ].filter(Boolean);

  return (
    <li className="item">
      {item.thumbnailUrl ? (
        // Plain <img>: previews come from many external sites, so Next's image optimizer isn't used here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumbnailUrl} alt="" loading="lazy" />
      ) : (
        <div className="placeholder">{item.type}</div>
      )}
      <div className="item-info">
        <span className="filename">{item.filename}</span>
        <span className="muted">{details.join(" · ")}</span>
      </div>
      <a className="button" href={item.downloadUrl}>
        Download
      </a>
    </li>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
