import { ServerStatus } from "./server-status";

// Server Component (no "use client"): rendered on the server, sends plain HTML.
export default function HomePage() {
  return (
    <main>
      <h1>Downloader</h1>
      <p className="muted">Fast downloads from open and public sources.</p>

      {/* Client Component: runs in the browser and talks to the API */}
      <ServerStatus />
    </main>
  );
}
