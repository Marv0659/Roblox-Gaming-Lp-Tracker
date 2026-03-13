/**
 * Riot API region/platform routing.
 * - account-v1 and match-v5 use regional endpoints (americas, europe, asia, sea).
 * - summoner-v4 and league-v4 use platform endpoints (na1, euw1, etc.).
 */

export const PLATFORM_TO_ROUTING: Record<string, string> = {
  br1: "americas",
  eun1: "europe",
  euw1: "europe",
  jp1: "asia",
  kr: "asia",
  la1: "americas",
  la2: "americas",
  na1: "americas",
  oc1: "sea",
  ph2: "sea",
  ru: "europe",
  sg2: "sea",
  th2: "sea",
  tr1: "europe",
  tw2: "sea",
  vn2: "sea",
};

export type PlatformId = keyof typeof PLATFORM_TO_ROUTING;

export function getRoutingRegion(platform: string): string {
  const r = PLATFORM_TO_ROUTING[platform.toLowerCase()];
  if (!r) throw new Error(`Unknown platform: ${platform}`);
  return r;
}

export function isValidPlatform(platform: string): boolean {
  return platform.toLowerCase() in PLATFORM_TO_ROUTING;
}
