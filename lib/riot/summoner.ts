/**
 * Riot summoner-v4 API.
 * Base URL: https://{platform}.api.riotgames.com
 * Platform = na1, euw1, kr, etc.
 */

import type { SummonerDto } from "@/types/riot";
import { riotFetch } from "./client";

const BASE = "https://{platform}.api.riotgames.com";

export async function getSummonerByPuuid(
  platform: string,
  puuid: string
): Promise<SummonerDto> {
  const url = `${BASE.replace("{platform}", platform)}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
  return riotFetch<SummonerDto>(url);
}

export async function getSummonerBySummonerId(
  platform: string,
  summonerId: string
): Promise<SummonerDto> {
  const url = `${BASE.replace("{platform}", platform)}/lol/summoner/v4/summoners/${encodeURIComponent(summonerId)}`;
  return riotFetch<SummonerDto>(url);
}
