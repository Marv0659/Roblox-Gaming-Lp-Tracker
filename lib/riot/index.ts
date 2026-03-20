/**
 * Riot API service layer — use only on the server.
 * - Onboard: resolve Riot ID to puuid/summoner and create TrackedPlayer.
 * - Sync ranked: fetch league-v4 entries and store RankSnapshot.
 * - Sync matches: fetch match ids → match details, store Match + MatchParticipant for our tracked puuids.
 */

import { prisma } from "@/lib/db";
import { getAccountByRiotId } from "./account";
import { getLeagueEntriesByPuuid } from "./league";
import { getMatchIdsByPuuid, getMatchById } from "./match";
import { getSummonerByPuuid } from "./summoner";
import { getRoutingRegion, isValidPlatform } from "./regions";
import { snapshotMeaningfullyChanged } from "@/lib/lp-history";
import { persistRankEventsForNewSnapshot } from "@/lib/rank-events";
import type {
  RiotAccountDto,
  SummonerDto,
  LeagueEntryDto,
  MatchDto,
  ParticipantDto,
  AddPlayerInput,
} from "@/types/riot";

/**
 * High-level Riot API helpers for server-side use.
 * These are thin wrappers over the per-endpoint modules.
 */

export async function apiGetAccountByRiotId(params: {
  gameName: string;
  tagLine: string;
  platform: string;
}): Promise<RiotAccountDto> {
  const routingRegion = getRoutingRegion(params.platform);
  return getAccountByRiotId(routingRegion, params.gameName, params.tagLine);
}

export async function apiGetSummonerByPuuid(platform: string, puuid: string): Promise<SummonerDto> {
  return getSummonerByPuuid(platform, puuid);
}

export async function apiGetLeagueEntriesByPuuid(
  platform: string,
  puuid: string
): Promise<LeagueEntryDto[]> {
  return getLeagueEntriesByPuuid(platform, puuid);
}

export async function apiGetRecentMatchIdsByPuuid(
  platform: string,
  puuid: string,
  options?: { start?: number; count?: number; queue?: number; startTime?: number; endTime?: number }
): Promise<string[]> {
  const routingRegion = getRoutingRegion(platform);
  return getMatchIdsByPuuid(routingRegion, puuid, options);
}

export async function apiGetMatchById(platform: string, matchId: string): Promise<MatchDto> {
  const routingRegion = getRoutingRegion(platform);
  return getMatchById(routingRegion, matchId);
}

// ---------------------------------------------------------------------------
// Legacy higher-level helpers used by app/actions/players.ts
// These wrap Prisma writes around the Riot API helpers.
// ---------------------------------------------------------------------------

// Queue IDs we care about (Solo/Duo = 420, Flex = 440)
export const RANKED_QUEUE_IDS = [420, 440] as const;

/**
 * Onboard a tracked player by Riot ID. Resolves account (puuid) and summoner, then creates DB record.
 */
export async function onboardTrackedPlayer(
  input: AddPlayerInput
): Promise<{ id: string; puuid: string }> {
  const { gameName, tagLine, region } = input;
  const platform = region.toLowerCase();
  if (!isValidPlatform(platform)) {
    throw new Error(`Invalid region: ${region}`);
  }
  const routingRegion = getRoutingRegion(platform);

  const account = await getAccountByRiotId(routingRegion, gameName, tagLine);
  const puuid = account.puuid;

  const existing = await prisma.trackedPlayer.findUnique({ where: { puuid } });
  if (existing) {
    return { id: existing.id, puuid: existing.puuid };
  }

  const summoner = await getSummonerByPuuid(platform, puuid);

  const player = await prisma.trackedPlayer.create({
    data: {
      puuid: account.puuid,
      accountId: summoner.accountId,
      summonerId: summoner.id,
      gameName: account.gameName,
      tagLine: account.tagLine,
      region: platform,
      routingRegion,
    },
  });
  return { id: player.id, puuid: player.puuid };
}

/**
 * Sync ranked data for a tracked player: fetch league entries (by-puuid) and store new snapshots
 * only when something meaningful changed (tier, rank, LP, wins, losses). Ignores unchanged syncs.
 */
export async function syncRankedForPlayer(trackedPlayerId: string): Promise<void> {
  const player = await prisma.trackedPlayer.findUnique({
    where: { id: trackedPlayerId },
  });

  if (!player) throw new Error("Tracked player not found");

  const entries = await getLeagueEntriesByPuuid(player.region, player.puuid);

  for (const e of entries) {
    const latest = await prisma.rankSnapshot.findFirst({
      where: {
        trackedPlayerId: player.id,
        queueType: e.queueType,
      },
      orderBy: { createdAt: "desc" },
    });

    const incoming = {
      tier: e.tier,
      rank: e.rank,
      leaguePoints: e.leaguePoints,
      wins: e.wins,
      losses: e.losses,
    };
    if (!snapshotMeaningfullyChanged(latest, incoming)) continue;

    const newSnapshot = await prisma.rankSnapshot.create({
      data: {
        trackedPlayerId: player.id,
        queueType: e.queueType,
        tier: e.tier,
        rank: e.rank,
        leaguePoints: e.leaguePoints,
        wins: e.wins,
        losses: e.losses,
      },
    });

    await persistRankEventsForNewSnapshot(
      player.id,
      e.queueType,
      latest,
      newSnapshot
    );
  }
}

/**
 * Sync recent ranked matches for a tracked player. Fetches match IDs, then each match,
 * and upserts Match + MatchParticipant for every tracked player in that match.
 * Skips if match already in DB.
 */
export async function syncMatchesForPlayer(
  trackedPlayerId: string,
  count: number = 20
): Promise<{ matchesAdded: number }> {
  const player = await prisma.trackedPlayer.findUnique({
    where: { id: trackedPlayerId },
  });
  if (!player) throw new Error("Tracked player not found");

  // Fetch both ranked queues (420 solo/duo + 440 flex), then dedupe.
  // Also fetch a generic recent list as a fallback in case queue-filtered
  // match ID endpoints are inconsistent for some accounts/regions.
  const idsPerQueue = await Promise.all(
    RANKED_QUEUE_IDS.map((queueId) =>
      getMatchIdsByPuuid(player.routingRegion, player.puuid, {
        count,
        queue: queueId,
      })
    )
  );
  const fallbackRecentIds = await getMatchIdsByPuuid(
    player.routingRegion,
    player.puuid,
    {
      count: Math.max(count * 2, 50),
    }
  );
  const matchIds = [...new Set([...idsPerQueue.flat(), ...fallbackRecentIds])];

  const allTracked = await prisma.trackedPlayer.findMany({
    select: { id: true, puuid: true },
  });
  const puuidToId = new Map(allTracked.map((p) => [p.puuid, p.id]));

  let matchesAdded = 0;
  for (const matchId of matchIds) {
    const existing = await prisma.match.findUnique({
      where: { riotMatchId: matchId },
    });
    const matchDto = await getMatchById(player.routingRegion, matchId);
    // Keep only ranked solo/flex games in DB for this sync path.
    if (!RANKED_QUEUE_IDS.includes(matchDto.info.queueId as (typeof RANKED_QUEUE_IDS)[number])) {
      continue;
    }

    const trackedParticipants = matchDto.info.participants
      .map((p) => ({ p, trackedPlayerId: puuidToId.get(p.puuid) }))
      .filter(
        (x): x is { p: ParticipantDto; trackedPlayerId: string } =>
          typeof x.trackedPlayerId === "string"
      );
    if (trackedParticipants.length === 0) continue;

    if (!existing) {
      await prisma.match.create({
        data: {
          riotMatchId: matchDto.metadata.matchId,
          gameStartAt: new Date(matchDto.info.gameStartTimestamp),
          queueId: matchDto.info.queueId,
          gameDuration: matchDto.info.gameDuration,
          participants: {
            create: trackedParticipants.map(({ trackedPlayerId, p }) => ({
              trackedPlayerId,
              championId: p.championId,
              championName: p.championName ?? undefined,
              kills: p.kills,
              deaths: p.deaths,
              assists: p.assists,
              win: p.win,
              teamPosition: p.teamPosition || undefined,
              lane: p.individualPosition || undefined,
              cs: p.totalMinionsKilled + (p.neutralMinionsKilled ?? 0),
              gold: p.goldEarned,
              damageDealt: p.totalDamageDealtToChampions,
              visionScore: p.visionScore,
            })),
          },
        },
      });
      matchesAdded++;
      continue;
    }

    // Match already exists: backfill any missing tracked participants.
    const existingParticipants = await prisma.matchParticipant.findMany({
      where: { matchId: existing.id },
      select: { trackedPlayerId: true },
    });
    const existingIds = new Set(existingParticipants.map((p) => p.trackedPlayerId));
    const missing = trackedParticipants.filter(
      ({ trackedPlayerId }) => !existingIds.has(trackedPlayerId)
    );
    if (missing.length === 0) continue;

    await prisma.match.update({
      where: { id: existing.id },
      data: {
        participants: {
          create: missing.map(({ trackedPlayerId, p }) => ({
            trackedPlayerId,
            championId: p.championId,
            championName: p.championName ?? undefined,
            kills: p.kills,
            deaths: p.deaths,
            assists: p.assists,
            win: p.win,
            teamPosition: p.teamPosition || undefined,
            lane: p.individualPosition || undefined,
            cs: p.totalMinionsKilled + (p.neutralMinionsKilled ?? 0),
            gold: p.goldEarned,
            damageDealt: p.totalDamageDealtToChampions,
            visionScore: p.visionScore,
          })),
        },
      },
    });
  }
  return { matchesAdded };
}

/**
 * Full sync for a tracked player: ranked + recent matches.
 * Extension: add a cron or background job that calls this for all players.
 */
export async function syncPlayer(
  trackedPlayerId: string
): Promise<{ rankedSynced: boolean; matchesAdded: number }> {
  await syncRankedForPlayer(trackedPlayerId);
  const { matchesAdded } = await syncMatchesForPlayer(trackedPlayerId);
  return { rankedSynced: true, matchesAdded };
}

// Re-export low-level pieces for advanced callers.
export {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntriesByPuuid,
  getMatchIdsByPuuid,
  getMatchById,
};
export { getRoutingRegion, isValidPlatform, PLATFORM_TO_ROUTING } from "./regions";
