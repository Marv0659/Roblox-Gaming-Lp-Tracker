/**
 * Base Riot API client. All requests go through this to attach the API key.
 * Never expose RIOT_API_KEY to the client — use only in server-side code.
 */

const RIOT_API_KEY = process.env.RIOT_API_KEY;

if (!RIOT_API_KEY && process.env.NODE_ENV === "production") {
  console.warn("RIOT_API_KEY is not set; Riot API calls will fail.");
}

export function getRiotApiKey(): string | undefined {
  return RIOT_API_KEY;
}

/**
 * Error type for Riot HTTP failures (non-2xx, 429, etc.).
 * Useful if you want to special-case rate limits or 404s in callers.
 */
export class RiotApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RiotApiError";
    this.status = status;
  }
}

/**
 * Fetch helper that attaches the Riot API key and normalizes errors.
 */
export async function riotFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  if (!RIOT_API_KEY) {
    throw new Error("RIOT_API_KEY is not configured");
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      "X-Riot-Token": RIOT_API_KEY,
      Accept: "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    throw new RiotApiError(
      `Riot API rate limited. Retry after: ${retryAfter ?? "unknown"}s`,
      429
    );
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new RiotApiError(
      `Riot API error ${res.status}: ${JSON.stringify(body)}`,
      res.status
    );
  }

  return (await res.json()) as T;
}
