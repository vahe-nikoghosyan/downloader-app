import type { ProviderInfo } from "@downloader/shared";
import { directProvider } from "./direct.js";
import { nasaProvider } from "./nasa.js";
import type { Provider } from "./provider.js";
import { wikimediaProvider } from "./wikimedia.js";

// All providers. To support a new site: create a provider file and add it here.
// Order matters: the first provider that can handle a link wins, so the generic one goes last.
const providers: Provider[] = [wikimediaProvider, nasaProvider, directProvider];

export function findProvider(url: URL): Provider | undefined {
  return providers.find((provider) => provider.canHandle(url));
}

export function listProviders(): ProviderInfo[] {
  return providers.map(({ id, name, example }) => ({ id, name, example }));
}
