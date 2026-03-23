/**
 * Global champion trust / fraud leaderboards across all tracked players.
 * Reuses computeChampionTrust; no Riot API. Server-side only.
 */

import { prisma } from "@/lib/db";
import { computeChampionTrust, type ChampionTrustLabel, type ChampionTrustResult, type SampleQuality } from "@/lib/champion-trust";

// ------------ Tunable (ranking & hidden pocket definition) ------------
const MAX_ROWS_PER_CATEGORY = 8;
const MIN_GAMES_HIDDEN_POCKET = 3;
const MAX_GAMES_HIDDEN_POCKET = 7;
const WINRATE_HIDDEN_POCKET = 60; // % — lower volume but strong
// ---------------------------------------------------------------------

export interface GlobalChampionTrustRow {
  playerId: string;
  gameName: string;
  tagLine: string;
  championName: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  avgKda: number;
  recentWinrate: number | null;
  trustLabel: ChampionTrustLabel;
  shortReason: string;
  rankingScore: number;
  sampleQuality: SampleQuality;
}

export interface GlobalChampionTrustLeaderboards {
  /** Most fraudulent comfort picks: play it a lot, results are poor. */
  fraudulentComfortPicks: GlobalChampionTrustRow[];
  /** Most trusted: strong sample + reliably good. */
  mostTrustedPicks: GlobalChampionTrustRow[];
  /** Biggest coinflips: volatile / inconsistent. */
  coinflipPicks: GlobalChampionTrustRow[];
  /** Hidden pocket: lower volume but surprisingly strong. */
  hiddenPocketPicks: GlobalChampionTrustRow[];
}

function toRow(
  playerId: string,
  gameName: string,
  tagLine: string,
  c: ChampionTrustResult,
  rankingScore: number
): GlobalChampionTrustRow {
  return {
    playerId,
    gameName,
    tagLine,
    championName: c.championName,
    games: c.games,
    wins: c.wins,
    losses: c.losses,
    winrate: c.winrate,
    avgKda: c.avgKda,
    recentWinrate: c.recentWinrate,
    trustLabel: c.trustLabel,
    shortReason: c.trustReason,
    rankingScore,
    sampleQuality: c.sampleQuality,
  };
}

/**
 * Fetches all tracked players with recent match participants, runs champion trust
 * per player, then aggregates into global leaderboards per category.
 */
export async function getGlobalChampionTrustLeaderboards(): Promise<GlobalChampionTrustLeaderboards> {
  const players = await prisma.trackedPlayer.findMany({
    include: {
      matchParticipants: {
        include: { match: { select: { gameStartAt: true, gameDuration: true } } },
        orderBy: { match: { gameStartAt: "desc" } },
        take: 60,
      },
    },
  });

  const allRows: GlobalChampionTrustRow[] = [];
  const hiddenPocketRows: GlobalChampionTrustRow[] = [];

  for (const p of players) {
    const matchInputs = p.matchParticipants.map((m) => ({
      win: m.win,
      championName: m.championName,
      kills: m.kills,
      deaths: m.deaths,
      assists: m.assists,
      gameStartAt: m.match.gameStartAt,
      gameDuration: m.match.gameDuration,
    }));
    const trustResults = computeChampionTrust(matchInputs);

    for (const c of trustResults) {
      let rankingScore = 0;
      if (c.trustLabel === "FAKE_COMFORT_PICK") {
        rankingScore = c.games * (100 - c.winrate); // more games + lower WR = more fraudulent
      } else if (c.trustLabel === "TRUSTED") {
        rankingScore = c.games * c.winrate; // more games + higher WR = more trusted
      } else if (c.trustLabel === "COINFLIP") {
        rankingScore = c.games; // biggest coinflips by volume
      }
      allRows.push(toRow(p.id, p.gameName, p.tagLine, c, rankingScore));

      // Hidden pocket: 3–8 games and >= 60% WR (separate list, no duplicate in allRows)
      if (
        c.trustLabel === "POCKET_PICK" &&
        c.games >= MIN_GAMES_HIDDEN_POCKET &&
        c.games <= MAX_GAMES_HIDDEN_POCKET &&
        c.winrate >= WINRATE_HIDDEN_POCKET
      ) {
        const pocketScore = c.winrate * Math.log(c.games + 1);
        hiddenPocketRows.push({
          ...toRow(p.id, p.gameName, p.tagLine, c, pocketScore),
          shortReason: `${c.games} games, ${c.winrate.toFixed(0)}% WR — pocket pick`,
        });
      }
    }
  }

  const fraudulentComfortPicks = allRows
    .filter((r) => r.trustLabel === "FAKE_COMFORT_PICK")
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .slice(0, MAX_ROWS_PER_CATEGORY);

  const mostTrustedPicks = allRows
    .filter((r) => r.trustLabel === "TRUSTED")
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .slice(0, MAX_ROWS_PER_CATEGORY);

  const coinflipPicks = allRows
    .filter((r) => r.trustLabel === "COINFLIP")
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .slice(0, MAX_ROWS_PER_CATEGORY);

  const hiddenPocketPicks = hiddenPocketRows
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .slice(0, MAX_ROWS_PER_CATEGORY);

  return {
    fraudulentComfortPicks,
    mostTrustedPicks,
    coinflipPicks,
    hiddenPocketPicks,
  };
}
