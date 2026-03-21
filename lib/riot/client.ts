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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Max retries for 429 / transient failures (Riot: respect Retry-After when present). */
const RIOT_FETCH_MAX_RETRIES = 8;

/**
 * Fetch helper that attaches the Riot API key and normalizes errors.
 * Automatically retries on 429 using the Retry-After header (seconds) or exponential backoff.
 */
export async function riotFetch<T>(
  url: string,
  options: RequestInit = {},
  attempt = 0
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
    if (attempt < RIOT_FETCH_MAX_RETRIES) {
      const retryAfter = res.headers.get("Retry-After");
      let waitMs: number;
      if (retryAfter != null && retryAfter !== "") {
        const sec = Number.parseFloat(retryAfter);
        waitMs = Number.isFinite(sec) ? Math.ceil(sec * 1000) : 1000 * (attempt + 1);
      } else {
        waitMs = Math.min(60_000, 1000 * 2 ** attempt + Math.floor(Math.random() * 400));
      }
      await sleep(waitMs);
      return riotFetch<T>(url, options, attempt + 1);
    }
    const retryAfter = res.headers.get("Retry-After");
    throw new RiotApiError(
      `Riot API rate limited after ${RIOT_FETCH_MAX_RETRIES} retries. Retry-After was: ${retryAfter ?? "unknown"}`,
      429
    );
  }

  // Occasional gateway / overload — short retry
  if (res.status === 503 && attempt < RIOT_FETCH_MAX_RETRIES) {
    await sleep(1500 * (attempt + 1));
    return riotFetch<T>(url, options, attempt + 1);
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
