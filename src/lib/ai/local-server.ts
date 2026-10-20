import { guardedFetch } from "./guarded-fetch";
import {
  defaultModelForProvider,
  isLocalServerProvider,
  localServerApiRoot,
} from "./providers";
import type { AiSettings } from "./types";

/** Embedding models share `/v1/models` with chat models but can't answer a prompt. */
const NON_CHAT = /embed|rerank|whisper|tts/i;

/** Chat-capable model ids from a local server's `GET <root>/v1/models`. */
export async function listLocalServerModels(
  settings: AiSettings,
  allowedHosts?: readonly string[],
): Promise<string[]> {
  if (!isLocalServerProvider(settings.provider)) return [];
  const url = `${localServerApiRoot(settings.provider, settings)}/models`;
  const res = await guardedFetch(allowedHosts)(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  const json: unknown = await res.json();
  const data = (json as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return [];
  const ids: string[] = [];
  for (const entry of data) {
    const id = (entry as { id?: unknown } | null)?.id;
    if (typeof id === "string" && id.trim() && !NON_CHAT.test(id)) {
      ids.push(id);
    }
  }
  return ids;
}

/** The model a request should use. A typed model wins; a blank one on a local
 *  server is auto-detected from `/v1/models` (first listed), falling back to the
 *  provider's default id when the server is unreachable or lists nothing. */
export async function resolveLocalModel(
  settings: AiSettings,
  allowedHosts?: readonly string[],
): Promise<string> {
  const typed = settings.model.trim();
  if (typed || !isLocalServerProvider(settings.provider)) return typed;
  try {
    const [first] = await listLocalServerModels(settings, allowedHosts);
    if (first) return first;
  } catch {
    // Unreachable server: the default id below lets the request surface the
    // real connection error instead of failing on a blank model.
  }
  return defaultModelForProvider(settings.provider);
}
