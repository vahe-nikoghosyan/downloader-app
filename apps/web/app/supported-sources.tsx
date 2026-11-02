import type { ListProvidersResponse } from "@downloader/shared";
import { API_URL } from "@/lib/api";

// Server Component that fetches data: runs on the Next.js server on every request,
// so the list always matches what the API supports. No JavaScript is sent to the browser for it.
export async function SupportedSources() {
  const providers = await fetch(`${API_URL}/api/media/providers`, { cache: "no-store" })
    .then((response) => (response.ok ? (response.json() as Promise<ListProvidersResponse>) : null))
    .then((data) => data?.providers ?? [])
    .catch(() => []);

  if (providers.length === 0) return null;

  return (
    <section className="sources">
      <h2>Supported sources</h2>
      <ul>
        {providers.map((provider) => (
          <li key={provider.id}>
            <strong>{provider.name}</strong>
            <code>{provider.example}</code>
          </li>
        ))}
      </ul>
    </section>
  );
}
