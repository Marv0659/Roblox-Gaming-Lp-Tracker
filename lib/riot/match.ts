/**
 * Riot match-v5 API.
 * Base URL: https://{region}.api.riotgames.com
 * Region = americas | europe | asia | sea
 */

import type { MatchDto } from "@/types/riot";
import { riotFetch } from "./client";

const BASE = "https://{region}.api.riotgames.com";

const MATCH_BY_PUUID_PATH = "/lol/match/v5/matches/by-puuid/{puuid}/ids";

export async function getMatchIdsByPuuid(
  routingRegion: string,
  puuid: string,
  options?: { start?: number; count?: number; queue?: number; startTime?: number; endTime?: number }
): Promise<string[]> {
  const params = new URLSearchParams();
  if (options?.start != null) params.set("start", String(options.start));
  if (options?.count != null) params.set("count", String(options.count));
  if (options?.queue != null) params.set("queue", String(options.queue));
  if (options?.startTime != null) params.set("startTime", String(options.startTime));
  if (options?.endTime != null) params.set("endTime", String(options.endTime));
  const qs = params.toString();
  const path = MATCH_BY_PUUID_PATH.replace("{puuid}", encodeURIComponent(puuid));
  const url = `${BASE.replace("{region}", routingRegion)}${path}${qs ? `?${qs}` : ""}`;
  return riotFetch<string[]>(url);
}

export async function getMatchById(
  routingRegion: string,
  matchId: string
): Promise<MatchDto> {
  const url = `${BASE.replace("{region}", routingRegion)}/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
  return riotFetch<MatchDto>(url);
}
