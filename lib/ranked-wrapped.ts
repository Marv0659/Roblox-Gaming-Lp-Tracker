/**
 * Ranked Wrapped — season/squad recap from DB only (snapshots, matches, duo pairs, rank events).
 * No Riot API. Composable; scope supports "all history" today and date ranges later.
 */

import { prisma } from "@/lib/db";
import { SOLO_QUEUE } from "@/lib/leaderboard";
import {
  computeDerivedPlayerStats,
  computeChampionStats,
  getMostPlayedChampion,
  withoutRemakes,
  type MatchParticipantInput,
  type RankSnapshotInput,
} from "@/lib/derived-stats";
import { computeChampionTrust, type ChampionTrustResult } from "@/lib/champion-trust";
import {
  deriveSnapshotDeltas,
  associateMatchesWithDeltas,
  type SnapshotLike,
} from "@/lib/lp-history";
import { rankToScore, type RankLike } from "@/lib/rank-utils";
import { getDuoStats, type DuoPair } from "@/lib/duo-stats";
import {
  buildPlayerNarrative,
  buildGroupNarrative,
} from "@/lib/ranked-wrapped-narrative";

// ---- Queues & tunable thresholds ----
export const RANKED_QUEUE_IDS: readonly number[] = [420, 440];

const MIN_GAMES_DUO = 3;
const MIN_GAMES_WINRATE = 8;
const ROLLING_WINDOW = 5;
const MIN_GAMES_CONSISTENCY = 15;
/** Minimum games to show per-player wrapped meaningfully */
export const MIN_GAMES_WRAPPED_HINT = 3;

// ---------------------------------------------------------------------------
// Scope (extend later for splits / custom ranges)
// ---------------------------------------------------------------------------

export type RankedWrappedScope =
  | { kind: "all" }
  | { kind: "range"; start: Date; end: Date };

export interface RankedWrappedScopeDescriptor {
  label: string;
  kind: RankedWrappedScope["kind"];
  start?: string;
  end?: string;
}

function describeScope(scope: RankedWrappedScope): RankedWrappedScopeDescriptor {
  if (scope.kind === "all") {
    return { label: "All tracked history", kind: "all" };
  }
  return {
    label: `${scope.start.toLocaleDateString()} – ${scope.end.toLocaleDateString()}`,
    kind: "range",
    start: scope.start.toISOString(),
    end: scope.end.toISOString(),
  };
}

function inDateRange(d: Date, scope: RankedWrappedScope): boolean {
  if (scope.kind === "all") return true;
  const t = d.getTime();
  return t >= scope.start.getTime() && t <= scope.end.getTime();
}

function isRankedQueue(queueId: number): boolean {
  return RANKED_QUEUE_IDS.includes(queueId);
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function formatRankLabel(tier: string, rank: string, lp: number): string {
  if (!tier) return "Unranked";
  const div = rank && rank !== "" ? ` ${rank}` : "";
  const lpPart = tier === "MASTER" || tier === "GRANDMASTER" || tier === "CHALLENGER" ? ` · ${lp} LP` : ` · ${lp} LP`;
  return `${tier}${div}${lpPart}`;
}

function longestWinLossStreaks(winsChronological: boolean[]): {
  maxWin: number;
  maxLoss: number;
} {
  let maxW = 0;
  let maxL = 0;
  let curW = 0;
  let curL = 0;
  for (const w of winsChronological) {
    if (w) {
      curW++;
      curL = 0;
      maxW = Math.max(maxW, curW);
    } else {
      curL++;
      curW = 0;
      maxL = Math.max(maxL, curL);
    }
  }
  return { maxWin: maxW, maxLoss: maxL };
}

/** Max wins in any rolling window of `size` consecutive games. */
function bestRollingWins(winsChronological: boolean[], size: number): number {
  if (winsChronological.length === 0) return 0;
  if (winsChronological.length < size) {
    return winsChronological.filter(Boolean).length;
  }
  let best = 0;
  for (let i = 0; i <= winsChronological.length - size; i++) {
    const slice = winsChronological.slice(i, i + size);
    const c = slice.filter(Boolean).length;
    best = Math.max(best, c);
  }
  return best;
}

/** Min wins in any rolling window — "collapse" */
function worstRollingWins(winsChronological: boolean[], size: number): number {
  if (winsChronological.length === 0) return 0;
  if (winsChronological.length < size) {
    return winsChronological.filter(Boolean).length;
  }
  let worst = size;
  for (let i = 0; i <= winsChronological.length - size; i++) {
    const slice = winsChronological.slice(i, i + size);
    const c = slice.filter(Boolean).length;
    worst = Math.min(worst, c);
  }
  return worst;
}

/** Lower = more consistent swing between wins and losses in 5-game windows. */
function rollingWinrateStdDev(winsChronological: boolean[], windowSize: number): number | null {
  if (winsChronological.length < windowSize * 2) return null;
  const rates: number[] = [];
  for (let i = 0; i <= winsChronological.length - windowSize; i++) {
    const slice = winsChronological.slice(i, i + windowSize);
    rates.push(slice.filter(Boolean).length / windowSize);
  }
  if (rates.length < 2) return null;
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const variance =
    rates.reduce((s, r) => s + (r - mean) ** 2, 0) / rates.length;
  return Math.sqrt(variance);
}

function grossLpFromDeltas(deltas: { lpDelta: number }[]): {
  gained: number;
  lost: number;
} {
  let gained = 0;
  let lost = 0;
  for (const d of deltas) {
    if (d.lpDelta > 0) gained += d.lpDelta;
    else if (d.lpDelta < 0) lost += d.lpDelta;
  }
  return { gained, lost };
}

function pickTrustHighlights(trust: ChampionTrustResult[]): {
  trusted: ChampionTrustResult | null;
  fakeComfort: ChampionTrustResult | null;
  coinflip: ChampionTrustResult | null;
} {
  const trusted =
    trust.find((t) => t.trustLabel === "TRUSTED") ?? null;
  const fakeComfort =
    trust
      .filter((t) => t.trustLabel === "FAKE_COMFORT_PICK")
      .sort((a, b) => b.games - a.games)[0] ?? null;
  const coinflip =
    trust
      .filter((t) => t.trustLabel === "COINFLIP")
      .sort((a, b) => b.games - a.games)[0] ?? null;
  return { trusted, fakeComfort, coinflip };
}

// ---------------------------------------------------------------------------
// Types — exported for UI
// ---------------------------------------------------------------------------

export interface WrappedRankPoint {
  tier: string;
  rank: string;
  leaguePoints: number;
  at: string;
  label: string;
}

export interface PlayerRankedWrapped {
  playerId: string;
  gameName: string;
  tagLine: string;
  scope: RankedWrappedScopeDescriptor;
  rankedGamesPlayed: number;
  netLpSolo: number;
  grossLpGained: number;
  grossLpLost: number;
  highestRank: WrappedRankPoint | null;
  currentRank: WrappedRankPoint | null;
  peakToCurrentDrop: {
    peakLabel: string;
    currentLabel: string;
    peakScore: number;
    currentScore: number;
  } | null;
  longestWinStreak: number;
  longestLossStreak: number;
  overallWinrate: number | null;
  mostPlayedChampion: { name: string; games: number } | null;
  bestChampion: { name: string; games: number; winrate: number } | null;
  worstChampion: { name: string; games: number; winrate: number } | null;
  championTrust: {
    trusted: { name: string; games: number; winrate: number } | null;
    fakeComfort: { name: string; games: number; winrate: number } | null;
    coinflip: { name: string; games: number; winrate: number } | null;
  };
  bestStretch: { windowGames: number; winsInWindow: number };
  worstCollapse: { windowGames: number; winsInWindow: number };
  consistencyStdDev: number | null;
  bestDuoPartner: {
    partnerId: string;
    gameName: string;
    tagLine: string;
    games: number;
    winrate: number;
  } | null;
  derived: {
    lpGained7d: number;
    lpGained30d: number;
    currentWinStreak: number;
    currentLossStreak: number;
  };
  funTitle: string;
  narrative: { headline: string; lines: string[] };
  highlights: WrappedHighlight[];
  topMoments: TopMoment[];
}

export interface WrappedHighlight {
  id: string;
  title: string;
  detail: string;
  tone: "good" | "bad" | "neutral";
}

export interface TopMoment {
  id: string;
  label: string;
  description: string;
}

export interface GroupAward {
  id: string;
  title: string;
  subtitle: string;
  winner: {
    playerId: string;
    gameName: string;
    tagLine: string;
  } | null;
  stat?: string;
}

export interface GroupRankedWrapped {
  scope: RankedWrappedScopeDescriptor;
  generatedAt: string;
  squadSize: number;
  totalRankedGames: number;
  avgWinrate: number | null;
  awards: GroupAward[];
  narrative: { headline: string; lines: string[] };
  duoHighlight: {
    playerA: string;
    playerB: string;
    games: number;
    winrate: number;
  } | null;
}

export interface RankedWrappedBundle {
  scope: RankedWrappedScopeDescriptor;
  generatedAt: string;
  group: GroupRankedWrapped;
  players: PlayerRankedWrapped[];
}

interface PlayerAgg {
  playerId: string;
  gameName: string;
  tagLine: string;
  netLp: number;
  rankedGames: number;
  winrate: number | null;
  consistencyStdDev: number | null;
  fraudGames: number;
  fraudChampion: string | null;
  tragicLossStreak: number;
  worstFive: number; // min wins in 5-game window
}

// ---------------------------------------------------------------------------
// Core: build one player
// ---------------------------------------------------------------------------

function buildPlayer(
  raw: {
    id: string;
    gameName: string;
    tagLine: string;
    rankSnapshots: SnapshotLike[];
    matchParts: {
      win: boolean;
      championName: string | null;
      kills: number;
      deaths: number;
      assists: number;
      gameStartAt: Date;
      gameDuration: number;
      queueId: number;
    }[];
  },
  scope: RankedWrappedScope,
  duoPairs: DuoPair[],
  scopeDesc: RankedWrappedScopeDescriptor
): { wrapped: PlayerRankedWrapped; agg: PlayerAgg } {
  const snaps = raw.rankSnapshots
    .filter((s) => s.queueType === SOLO_QUEUE)
    .filter((s) => inDateRange(s.createdAt, scope))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const rankedParts = raw.matchParts.filter(
    (p) => isRankedQueue(p.queueId) && inDateRange(p.gameStartAt, scope)
  );
  const rankedAsc = [...rankedParts].sort(
    (a, b) => a.gameStartAt.getTime() - b.gameStartAt.getTime()
  );

  const matchInputsDesc: MatchParticipantInput[] = withoutRemakes(
    [...rankedAsc].sort(
      (a, b) => b.gameStartAt.getTime() - a.gameStartAt.getTime()
    ).map((m) => ({
      win: m.win,
      championName: m.championName,
      kills: m.kills,
      deaths: m.deaths,
      assists: m.assists,
      gameStartAt: m.gameStartAt,
      gameDuration: m.gameDuration,
    }))
  );

  const winsChrono = rankedAsc
    .filter((m) => m.gameDuration >= 210)
    .map((m) => m.win);

  const snapInputs: RankSnapshotInput[] = raw.rankSnapshots.map((s) => ({
    queueType: s.queueType,
    leaguePoints: s.leaguePoints,
    createdAt: s.createdAt,
  }));

  const derived = computeDerivedPlayerStats(
    { rankSnapshots: snapInputs, matches: matchInputsDesc },
    { queueType: SOLO_QUEUE }
  );

  const trust = computeChampionTrust(matchInputsDesc);
  const trustHl = pickTrustHighlights(trust);
  const { trusted, fakeComfort, coinflip } = trustHl;

  const streaks = longestWinLossStreaks(winsChrono);
  const bestStretchWins = bestRollingWins(winsChrono, ROLLING_WINDOW);
  const worstWinCount = worstRollingWins(winsChrono, ROLLING_WINDOW);
  const consistencyStdDev = rollingWinrateStdDev(winsChrono, ROLLING_WINDOW);

  // LP — solo queue snapshots in scope
  let netLp = 0;
  let grossGained = 0;
  let grossLost = 0;
  if (snaps.length >= 2) {
    netLp = snaps[snaps.length - 1].leaguePoints - snaps[0].leaguePoints;
    const deltas = deriveSnapshotDeltas(snaps, SOLO_QUEUE);
    const matchTimes = raw.matchParts.map((m) => ({ gameStartAt: m.gameStartAt }));
    associateMatchesWithDeltas(deltas, matchTimes);
    const g = grossLpFromDeltas(deltas);
    grossGained = g.gained;
    grossLost = g.lost;
  }

  let highest: WrappedRankPoint | null = null;
  let peakScore = -1;
  for (const s of snaps) {
    const sc = rankToScore({
      tier: s.tier,
      rank: s.rank,
      leaguePoints: s.leaguePoints,
    });
    if (sc > peakScore) {
      peakScore = sc;
      highest = {
        tier: s.tier,
        rank: s.rank,
        leaguePoints: s.leaguePoints,
        at: s.createdAt.toISOString(),
        label: formatRankLabel(s.tier, s.rank, s.leaguePoints),
      };
    }
  }

  const lastSnap = snaps.length ? snaps[snaps.length - 1] : null;
  const currentRank: WrappedRankPoint | null = lastSnap
    ? {
        tier: lastSnap.tier,
        rank: lastSnap.rank,
        leaguePoints: lastSnap.leaguePoints,
        at: lastSnap.createdAt.toISOString(),
        label: formatRankLabel(lastSnap.tier, lastSnap.rank, lastSnap.leaguePoints),
      }
    : null;

  let peakDrop: PlayerRankedWrapped["peakToCurrentDrop"] = null;
  if (highest && currentRank) {
    const hs = rankToScore({
      tier: highest.tier,
      rank: highest.rank,
      leaguePoints: highest.leaguePoints,
    });
    const cs = rankToScore({
      tier: currentRank.tier,
      rank: currentRank.rank,
      leaguePoints: currentRank.leaguePoints,
    });
    if (hs > cs) {
      peakDrop = {
        peakLabel: highest.label,
        currentLabel: currentRank.label,
        peakScore: hs,
        currentScore: cs,
      };
    }
  }

  const totalGames = winsChrono.length;
  const ow =
    totalGames > 0
      ? (winsChrono.filter(Boolean).length / totalGames) * 100
      : null;

  const champStats = computeChampionStats(matchInputsDesc);
  const mpName = getMostPlayedChampion(champStats);
  const mostPlayed =
    mpName && totalGames > 0
      ? { name: mpName, games: champStats.get(mpName)?.games ?? 0 }
      : null;

  const duosForPlayer = duoPairs
    .filter(
      (d) =>
        (d.playerA.id === raw.id || d.playerB.id === raw.id) &&
        d.gamesTogether >= MIN_GAMES_DUO
    )
    .map((d) => {
      const partner = d.playerA.id === raw.id ? d.playerB : d.playerA;
      return {
        partnerId: partner.id,
        gameName: partner.gameName,
        tagLine: partner.tagLine,
        games: d.gamesTogether,
        winrate: d.winrate,
      };
    })
    .sort((a, b) => b.winrate - a.winrate || b.games - a.games);

  const bestDuo = duosForPlayer[0] ?? null;

  const bestC = derived.bestChampionByWinrate;
  const worstC = derived.worstChampionByWinrate;

  const narrativeIn = {
    gameName: raw.gameName,
    rankedGames: totalGames,
    netLp,
    overallWinrate: ow,
    longestWinStreak: streaks.maxWin,
    longestLossStreak: streaks.maxLoss,
    mostPlayedChampion: mostPlayed?.name ?? null,
    bestChampionName: bestC?.championName ?? null,
    worstChampionName: worstC?.championName ?? null,
    trustedChampion: trusted?.championName ?? null,
    fakeComfortChampion: fakeComfort?.championName ?? null,
    peakTier: highest?.tier ?? "?",
    currentTier: currentRank?.tier ?? "?",
    rankDroppedFromPeak: peakDrop != null,
    bestDuoName: bestDuo ? `${bestDuo.gameName}#${bestDuo.tagLine}` : null,
    duoWinrate: bestDuo?.winrate ?? null,
  };

  const nOut = buildPlayerNarrative(narrativeIn);

  const highlights: WrappedHighlight[] = [];
  if (highest) {
    highlights.push({
      id: "peak",
      title: "Peak rank",
      detail: highest.label,
      tone: "good",
    });
  }
  if (fakeComfort) {
    highlights.push({
      id: "fake",
      title: "Audited comfort pick",
      detail: `${fakeComfort.championName} — ${fakeComfort.trustReason}`,
      tone: "bad",
    });
  }
  if (trusted) {
    highlights.push({
      id: "trust",
      title: "Trusted pick",
      detail: `${trusted.championName} — ${trusted.trustReason}`,
      tone: "good",
    });
  }
  highlights.push({
    id: "streaks",
    title: "Streak records",
    detail: `${streaks.maxWin} wins · ${streaks.maxLoss} losses (max)`,
    tone: "neutral",
  });

  const topMoments: TopMoment[] = [];
  if (bestStretchWins >= 4 && ROLLING_WINDOW >= 3) {
    topMoments.push({
      id: "hot",
      label: "Heater",
      description: `You won ${bestStretchWins} of ${ROLLING_WINDOW} in your best ${ROLLING_WINDOW}-game slice.`,
    });
  }
  if (worstWinCount <= 1 && winsChrono.length >= ROLLING_WINDOW) {
    topMoments.push({
      id: "cold",
      label: "Cold front",
      description: `A ${ROLLING_WINDOW}-game window hit only ${worstWinCount} win(s).`,
    });
  }
  if (bestDuo) {
    topMoments.push({
      id: "duo",
      label: "Duo boost",
      description: `${bestDuo.winrate.toFixed(0)}% WR with ${bestDuo.gameName} (${bestDuo.games} games).`,
    });
  }

  const wrapped: PlayerRankedWrapped = {
    playerId: raw.id,
    gameName: raw.gameName,
    tagLine: raw.tagLine,
    scope: scopeDesc,
    rankedGamesPlayed: totalGames,
    netLpSolo: netLp,
    grossLpGained: grossGained,
    grossLpLost: grossLost,
    highestRank: highest,
    currentRank,
    peakToCurrentDrop: peakDrop,
    longestWinStreak: streaks.maxWin,
    longestLossStreak: streaks.maxLoss,
    overallWinrate: ow,
    mostPlayedChampion: mostPlayed,
    bestChampion: bestC
      ? {
          name: bestC.championName,
          games: bestC.games,
          winrate: bestC.winrate,
        }
      : null,
    worstChampion: worstC
      ? {
          name: worstC.championName,
          games: worstC.games,
          winrate: worstC.winrate,
        }
      : null,
    championTrust: {
      trusted: trusted
        ? {
            name: trusted.championName,
            games: trusted.games,
            winrate: trusted.winrate,
          }
        : null,
      fakeComfort: fakeComfort
        ? {
            name: fakeComfort.championName,
            games: fakeComfort.games,
            winrate: fakeComfort.winrate,
          }
        : null,
      coinflip: coinflip
        ? {
            name: coinflip.championName,
            games: coinflip.games,
            winrate: coinflip.winrate,
          }
        : null,
    },
    bestStretch: { windowGames: ROLLING_WINDOW, winsInWindow: bestStretchWins },
    worstCollapse: { windowGames: ROLLING_WINDOW, winsInWindow: worstWinCount },
    consistencyStdDev,
    bestDuoPartner: bestDuo,
    derived: {
      lpGained7d: derived.lpGained7d,
      lpGained30d: derived.lpGained30d,
      currentWinStreak: derived.currentWinStreak,
      currentLossStreak: derived.currentLossStreak,
    },
    funTitle: nOut.funTitle,
    narrative: { headline: nOut.headline, lines: nOut.lines },
    highlights,
    topMoments,
  };

  const agg: PlayerAgg = {
    playerId: raw.id,
    gameName: raw.gameName,
    tagLine: raw.tagLine,
    netLp,
    rankedGames: totalGames,
    winrate: ow,
    consistencyStdDev,
    fraudGames: fakeComfort?.games ?? 0,
    fraudChampion: fakeComfort?.championName ?? null,
    tragicLossStreak: streaks.maxLoss,
    worstFive: worstWinCount,
  };

  return { wrapped, agg };
}

// ---------------------------------------------------------------------------
// Group awards
// ---------------------------------------------------------------------------

function pickMaxBy<T>(
  rows: T[],
  score: (row: T) => number | null,
  minGames: number,
  games: (row: T) => number
): T | null {
  const eligible = rows.filter((r) => games(r) >= minGames);
  if (eligible.length === 0) return null;
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const r of eligible) {
    const s = score(r);
    if (s == null || Number.isNaN(s)) continue;
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }
  return best;
}

function pickMinBy<T>(
  rows: T[],
  score: (row: T) => number | null,
  minGames: number,
  games: (row: T) => number
): T | null {
  const eligible = rows.filter((r) => games(r) >= minGames);
  if (eligible.length === 0) return null;
  let best: T | null = null;
  let bestScore = Infinity;
  for (const r of eligible) {
    const s = score(r);
    if (s == null || Number.isNaN(s)) continue;
    if (s < bestScore) {
      bestScore = s;
      best = r;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Full squad + per-player wrapped recap for the given scope.
 * Uses only DB-backed data (same sources as dashboard / profiles).
 */
export async function getRankedWrappedBundle(
  scope: RankedWrappedScope = { kind: "all" }
): Promise<RankedWrappedBundle> {
  const scopeDesc = describeScope(scope);
  const generatedAt = new Date().toISOString();

  const [playersRaw, duoPairs, rankEvents] = await Promise.all([
    prisma.trackedPlayer.findMany({
      include: {
        rankSnapshots: { orderBy: { createdAt: "asc" } },
        matchParticipants: {
          include: {
            match: {
              select: {
                gameStartAt: true,
                gameDuration: true,
                queueId: true,
              },
            },
          },
        },
      },
    }),
    getDuoStats(),
    prisma.rankEvent.findMany({
      where: { queueType: SOLO_QUEUE },
      select: {
        trackedPlayerId: true,
        eventType: true,
        createdAt: true,
      },
    }),
  ]);

  const eventsScoped = rankEvents.filter((e) => inDateRange(e.createdAt, scope));

  const players: PlayerRankedWrapped[] = [];
  const aggs: PlayerAgg[] = [];

  for (const p of playersRaw) {
    const matchParts = p.matchParticipants.map((mp) => ({
      win: mp.win,
      championName: mp.championName,
      kills: mp.kills,
      deaths: mp.deaths,
      assists: mp.assists,
      gameStartAt: mp.match.gameStartAt,
      gameDuration: mp.match.gameDuration,
      queueId: mp.match.queueId,
    }));

    const { wrapped, agg } = buildPlayer(
      {
        id: p.id,
        gameName: p.gameName,
        tagLine: p.tagLine,
        rankSnapshots: p.rankSnapshots as SnapshotLike[],
        matchParts,
      },
      scope,
      duoPairs,
      scopeDesc
    );
    players.push(wrapped);
    aggs.push(agg);
  }

  const totalRankedGames = aggs.reduce((s, a) => s + a.rankedGames, 0);
  const sumWr = aggs.filter((a) => a.winrate != null);
  const avgWinrate =
    sumWr.length > 0
      ? sumWr.reduce((s, a) => s + (a.winrate ?? 0), 0) / sumWr.length
      : null;

  const biggestClimber = pickMaxBy(
    aggs,
    (a) => a.netLp,
    MIN_GAMES_WRAPPED_HINT,
    (a) => a.rankedGames
  );
  const biggestLoser = pickMinBy(
    aggs,
    (a) => a.netLp,
    MIN_GAMES_WRAPPED_HINT,
    (a) => a.rankedGames
  );
  const mostGames = pickMaxBy(
    aggs,
    (a) => a.rankedGames,
    1,
    (a) => a.rankedGames
  );
  const bestWr = pickMaxBy(
    aggs,
    (a) => a.winrate,
    MIN_GAMES_WINRATE,
    (a) => a.rankedGames
  );
  const mostConsistent = pickMinBy(
    aggs,
    (a) => a.consistencyStdDev,
    MIN_GAMES_CONSISTENCY,
    (a) => a.rankedGames
  );
  const fraudsters = aggs.filter((a) => a.fraudGames > 0);
  const biggestFraud = pickMaxBy(
    fraudsters,
    (a) => a.fraudGames,
    1,
    (a) => a.rankedGames
  );
  const mostTragic = pickMaxBy(
    aggs,
    (a) => a.tragicLossStreak,
    MIN_GAMES_WRAPPED_HINT,
    (a) => a.rankedGames
  );
  const worstCollapse = pickMinBy(
    aggs,
    (a) => a.worstFive,
    MIN_GAMES_WRAPPED_HINT,
    (a) => a.rankedGames
  );

  const duoHighlight =
    duoPairs.filter((d) => d.gamesTogether >= MIN_GAMES_DUO)[0] ?? null;

  const demotionsByPlayer = new Map<string, number>();
  for (const e of eventsScoped) {
    if (e.eventType === "DEMOTED") {
      demotionsByPlayer.set(
        e.trackedPlayerId,
        (demotionsByPlayer.get(e.trackedPlayerId) ?? 0) + 1
      );
    }
  }
  let demotionKing: { id: string; n: number } | null = null;
  for (const [id, n] of demotionsByPlayer) {
    if (!demotionKing || n > demotionKing.n) demotionKing = { id, n };
  }

  const awards: GroupAward[] = [
    {
      id: "biggest_climber",
      title: "Biggest climber",
      subtitle: "Highest net LP (Solo/Duo snapshots in scope)",
      winner: biggestClimber
        ? {
            playerId: biggestClimber.playerId,
            gameName: biggestClimber.gameName,
            tagLine: biggestClimber.tagLine,
          }
        : null,
      stat: biggestClimber ? `${biggestClimber.netLp >= 0 ? "+" : ""}${biggestClimber.netLp} LP` : undefined,
    },
    {
      id: "biggest_lp_loser",
      title: "Biggest LP investor",
      subtitle: "Lowest net LP — the ladder sent invoices",
      winner: biggestLoser
        ? {
            playerId: biggestLoser.playerId,
            gameName: biggestLoser.gameName,
            tagLine: biggestLoser.tagLine,
          }
        : null,
      stat: biggestLoser ? `${biggestLoser.netLp} LP` : undefined,
    },
    {
      id: "most_games",
      title: "Most games played",
      subtitle: "Ranked volume champion",
      winner: mostGames
        ? {
            playerId: mostGames.playerId,
            gameName: mostGames.gameName,
            tagLine: mostGames.tagLine,
          }
        : null,
      stat: mostGames ? `${mostGames.rankedGames} games` : undefined,
    },
    {
      id: "best_winrate",
      title: "Best overall winrate",
      subtitle: `Requires ≥${MIN_GAMES_WINRATE} ranked games in scope`,
      winner: bestWr
        ? {
            playerId: bestWr.playerId,
            gameName: bestWr.gameName,
            tagLine: bestWr.tagLine,
          }
        : null,
      stat: bestWr?.winrate != null ? `${bestWr.winrate.toFixed(1)}%` : undefined,
    },
    {
      id: "most_consistent",
      title: "Most consistent",
      subtitle: "Lowest swing across 5-game rolling windows",
      winner: mostConsistent
        ? {
            playerId: mostConsistent.playerId,
            gameName: mostConsistent.gameName,
            tagLine: mostConsistent.tagLine,
          }
        : null,
      stat:
        mostConsistent?.consistencyStdDev != null
          ? `σ ≈ ${mostConsistent.consistencyStdDev.toFixed(2)}`
          : undefined,
    },
    {
      id: "biggest_fraud",
      title: "Most delusional comfort",
      subtitle: "Highest-volume fake comfort pick (champion trust)",
      winner: biggestFraud
        ? {
            playerId: biggestFraud.playerId,
            gameName: biggestFraud.gameName,
            tagLine: biggestFraud.tagLine,
          }
        : null,
      stat: biggestFraud?.fraudChampion
        ? `${biggestFraud.fraudChampion} (${biggestFraud.fraudGames} g)`
        : undefined,
    },
    {
      id: "most_tragic",
      title: "Most tragic loss streak",
      subtitle: "Longest loss streak in ranked",
      winner: mostTragic
        ? {
            playerId: mostTragic.playerId,
            gameName: mostTragic.gameName,
            tagLine: mostTragic.tagLine,
          }
        : null,
      stat: mostTragic ? `${mostTragic.tragicLossStreak} losses` : undefined,
    },
    {
      id: "worst_collapse",
      title: "Worst 5-game collapse",
      subtitle: "Fewest wins in any 5-game slice",
      winner: worstCollapse
        ? {
            playerId: worstCollapse.playerId,
            gameName: worstCollapse.gameName,
            tagLine: worstCollapse.tagLine,
          }
        : null,
      stat: worstCollapse ? `${worstCollapse.worstFive} wins / 5` : undefined,
    },
  ];

  if (demotionKing && demotionKing.n >= 2) {
    const pl = players.find((p) => p.playerId === demotionKing!.id);
    if (pl) {
      awards.push({
        id: "demotion_vip",
        title: "Elevator operator",
        subtitle: "Most demotions recorded in scope",
        winner: {
          playerId: pl.playerId,
          gameName: pl.gameName,
          tagLine: pl.tagLine,
        },
        stat: `${demotionKing.n} demotions`,
      });
    }
  }

  const groupNarrative = buildGroupNarrative({
    totalRankedGames,
    avgWinrate,
    biggestClimberName: biggestClimber?.gameName ?? null,
    biggestLpLoserName: biggestLoser?.gameName ?? null,
    mostGamesName: mostGames?.gameName ?? null,
  });

  const group: GroupRankedWrapped = {
    scope: scopeDesc,
    generatedAt,
    squadSize: players.length,
    totalRankedGames,
    avgWinrate,
    awards,
    narrative: groupNarrative,
    duoHighlight: duoHighlight
      ? {
          playerA: `${duoHighlight.playerA.gameName}#${duoHighlight.playerA.tagLine}`,
          playerB: `${duoHighlight.playerB.gameName}#${duoHighlight.playerB.tagLine}`,
          games: duoHighlight.gamesTogether,
          winrate: duoHighlight.winrate,
        }
      : null,
  };

  players.sort((a, b) => a.gameName.localeCompare(b.gameName));

  return {
    scope: scopeDesc,
    generatedAt,
    group,
    players,
  };
}

export async function getPlayerRankedWrapped(
  playerId: string,
  scope: RankedWrappedScope = { kind: "all" }
): Promise<PlayerRankedWrapped | null> {
  const bundle = await getRankedWrappedBundle(scope);
  return bundle.players.find((p) => p.playerId === playerId) ?? null;
}
