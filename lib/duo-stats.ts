/**
 * Duo stats: how tracked players perform when playing together (same match, same team).
 * Same team is inferred from same matchId + same win (no teamId in DB).
 * Uses existing Match + MatchParticipant data only.
 */

import { prisma } from "@/lib/db";

const SOLO_DUO_QUEUE_ID = 420;

export interface DuoPlayer {
  id: string;
  gameName: string;
  tagLine: string;
}

export interface DuoPair {
  playerA: DuoPlayer;
  playerB: DuoPlayer;
  gamesTogether: number;
  winsTogether: number;
  lossesTogether: number;
  winrate: number; // 0–100
}

/** Normalize pair key so (A,B) and (B,A) are the same. */
function pairKey(id1: string, id2: string): string {
  return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
}

/**
 * Loads all duo pair stats from the database.
 * Returns pairs with at least 1 game together, sorted by games together (desc) then winrate (desc).
 */
export async function getDuoStats(): Promise<DuoPair[]> {
  const participants = await prisma.matchParticipant.findMany({
    where: {
      match: {
        queueId: SOLO_DUO_QUEUE_ID,
      },
    },
    select: {
      matchId: true,
      win: true,
      trackedPlayerId: true,
      trackedPlayer: {
        select: { id: true, gameName: true, tagLine: true },
      },
    },
  });

  // Group by match: matchId -> { win -> playerIds }
  const byMatch = new Map<
    string,
    { win: boolean; playerIds: string[] }[]
  >();

  for (const p of participants) {
    const id = p.trackedPlayer.id;
    const win = p.win;
    const matchId = p.matchId;
    if (!byMatch.has(matchId)) {
      byMatch.set(matchId, []);
    }
    const teams = byMatch.get(matchId)!;
    let team = teams.find((t) => t.win === win);
    if (!team) {
      team = { win, playerIds: [] };
      teams.push(team);
    }
    team.playerIds.push(id);
  }

  // Aggregate pair -> { games, wins }
  const pairAgg = new Map<string, { games: number; wins: number }>();
  const playerMap = new Map<string, DuoPlayer>();

  for (const [, teams] of byMatch) {
    for (const { win, playerIds } of teams) {
      if (playerIds.length < 2) continue;
      for (let i = 0; i < playerIds.length; i++) {
        for (let j = i + 1; j < playerIds.length; j++) {
          const a = playerIds[i];
          const b = playerIds[j];
          const key = pairKey(a, b);
          const cur = pairAgg.get(key) ?? { games: 0, wins: 0 };
          cur.games += 1;
          if (win) cur.wins += 1;
          pairAgg.set(key, cur);
        }
      }
      for (const id of playerIds) {
        if (!playerMap.has(id)) {
          const p = participants.find((x: any) => x.trackedPlayer.id === id);
          if (p)
            playerMap.set(id, {
              id: p.trackedPlayer.id,
              gameName: p.trackedPlayer.gameName,
              tagLine: p.trackedPlayer.tagLine,
            });
        }
      }
    }
  }

  const pairs: DuoPair[] = [];
  for (const [key, agg] of pairAgg) {
    const [idA, idB] = key.split(":");
    const playerA = playerMap.get(idA);
    const playerB = playerMap.get(idB);
    if (!playerA || !playerB) continue;
    pairs.push({
      playerA,
      playerB,
      gamesTogether: agg.games,
      winsTogether: agg.wins,
      lossesTogether: agg.games - agg.wins,
      winrate: agg.games > 0 ? (agg.wins / agg.games) * 100 : 0,
    });
  }

  pairs.sort((a, b) => {
    if (b.gamesTogether !== a.gamesTogether)
      return b.gamesTogether - a.gamesTogether;
    return b.winrate - a.winrate;
  });

  return pairs;
}
