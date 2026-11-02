import { MediaDownloader } from "./media-downloader";
import { ServerStatus } from "./server-status";
import { SupportedSources } from "./supported-sources";

// Server Component (no "use client"): the page shell is rendered on the server.
export default function HomePage() {
  return (
    <main>
      <h1>Downloader</h1>
      <p className="muted">Fast downloads from open and public sources.</p>

      {/* Client Component: interactive form */}
      <MediaDownloader />

      {/* Server Component: fetches the list of supported sites on the server */}
      <SupportedSources />

      <footer className="muted">
        <ServerStatus />
      </footer>
    </main>
  );
}
