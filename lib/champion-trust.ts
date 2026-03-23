/**
 * Champion Trust Classification — data-driven labels per champion for a player.
 * Uses only existing match/participant data; no Riot API. Reusable server-side.
 */

import type { MatchParticipantInput } from "@/lib/derived-stats";
import { withoutRemakes } from "@/lib/derived-stats";


// ------------ Tunable thresholds (easy to tweak) ------------
const MIN_GAMES_TO_SHOW = 3; // Below this we omit the champion from results
const MIN_GAMES_MEANINGFUL = 5; // Minimum sample to avoid "insufficient data"
const MIN_GAMES_TRUSTED = 8;
const WINRATE_TRUSTED = 52; // % — stable positive over enough games
const WINRATE_DO_NOT_ALLOW = 40; // % — clearly bad idea
const WINRATE_FAKE_COMFORT = 45; // % — plays a lot but poor results
const WINRATE_COINFLIP_HIGH = 52; // Volatile middle band
const WINRATE_COINFLIP_LOW = 48;
const VOLATILE_SWING_DELTA = 15; // recent WR deviates this much from overall WR
const TOP_N_MOST_PLAYED_FOR_FAKE = 3; // Among top N by games + bad WR = fake comfort
const RECENT_GAMES_N = 5; // Last N games on champ for "recent" winrate
const MIN_RECENT_GAMES = 3; // Need at least this many for recentWinrate
// -----------------------------------------------------------

export type ChampionTrustLabel =
  | "TRUSTED"
  | "COINFLIP"
  | "DO_NOT_ALLOW"
  | "FAKE_COMFORT_PICK"
  | "POCKET_PICK"   // small sample, high WR — "pocket pick energy?"
  | "INSUFFICIENT_DATA";

export type SampleQuality = "high" | "medium" | "low";

export interface ChampionTrustResult {
  championName: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  avgKda: number;
  /** Winrate over last RECENT_GAMES_N games on this champion; null if not enough. */
  recentWinrate: number | null;
  trustLabel: ChampionTrustLabel;
  trustReason: string;
  sampleQuality: SampleQuality;
}

function normalizeChamp(name: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "unknown";
  return trimmed.toLowerCase();
}

function displayChampName(matches: MatchParticipantInput[]): string {
  const raw = matches.find((m) => m.championName?.trim())?.championName?.trim();
  return raw || "Unknown";
}

/** KDA = (kills + assists) / max(1, deaths) to avoid div by zero. */
function kda(k: number, d: number, a: number): number {
  return (k + a) / Math.max(1, d);
}

/**
 * Builds per-champion aggregates from match list. Matches should be ordered
 * by gameStartAt desc (most recent first) for correct "recent" window.
 */
function buildPerChampionStats(
  matches: MatchParticipantInput[]
): Map<
  string,
  {
    games: number;
    wins: number;
    winsRecent: number;
    gamesRecent: number;
      kdaSum: number;
      displayName: string;
  }
> {
  const byChamp = new Map<
    string,
    { list: MatchParticipantInput[] }
  >();
  for (const m of matches) {
    const name = normalizeChamp(m.championName);
    const cur = byChamp.get(name) ?? { list: [] };
    cur.list.push(m);
    byChamp.set(name, cur);
  }

  const out = new Map<
    string,
    {
      games: number;
      wins: number;
      winsRecent: number;
      gamesRecent: number;
      kdaSum: number;
      displayName: string;
    }
  >();
  for (const [name, { list }] of byChamp.entries()) {
    const games = list.length;
    const wins = list.filter((m) => m.win).length;
    const recent = list.slice(0, RECENT_GAMES_N);
    const gamesRecent = recent.length;
    const winsRecent = recent.filter((m) => m.win).length;
    const kdaSum = list.reduce(
      (acc, m) => acc + kda(m.kills, m.deaths, m.assists),
      0
    );
    out.set(name, {
      games,
      wins,
      winsRecent,
      gamesRecent,
      kdaSum,
      displayName: displayChampName(list),
    });
  }
  return out;
}

function isVolatile(winrate: number, recentWinrate: number | null): boolean {
  const inMiddleBand =
    winrate >= WINRATE_COINFLIP_LOW && winrate <= WINRATE_COINFLIP_HIGH;
  const hasRecentSwing =
    recentWinrate != null &&
    Math.abs(recentWinrate - winrate) >= VOLATILE_SWING_DELTA;
  return inMiddleBand || hasRecentSwing;
}

function sampleQuality(games: number): SampleQuality {
  if (games >= 10) return "high";
  if (games >= 5) return "medium";
  return "low";
}

/**
 * Pure classification: from match list (ordered by gameStartAt desc), returns
 * one ChampionTrustResult per champion that meets MIN_GAMES_TO_SHOW.
 * Labels are data-driven and a bit funny but defensible.
 */
export function computeChampionTrust(
  matches: MatchParticipantInput[]
): ChampionTrustResult[] {
  // Exclude remakes — they contribute no meaningful wins/losses/stats
  const validMatches = withoutRemakes(matches);
  const stats = buildPerChampionStats(validMatches);
  const sortedByGames = [...stats.entries()].sort(
    (a, b) => b[1].games - a[1].games
  );
  const topChampNames = new Set(
    sortedByGames.slice(0, TOP_N_MOST_PLAYED_FOR_FAKE).map(([n]) => n)
  );

  const results: ChampionTrustResult[] = [];

  for (const [championName, s] of stats.entries()) {
    if (s.games < MIN_GAMES_TO_SHOW) continue;

    const losses = s.games - s.wins;
    const winrate = (s.wins / s.games) * 100;
    const avgKda = s.kdaSum / s.games;
    const recentWinrate =
      s.gamesRecent >= MIN_RECENT_GAMES
        ? (s.winsRecent / s.gamesRecent) * 100
        : null;

    let trustLabel: ChampionTrustLabel;
    let trustReason: string;

    // FAKE_COMFORT_PICK: among most played but results are poor
    if (
      topChampNames.has(championName) &&
      s.games >= MIN_GAMES_MEANINGFUL &&
      winrate < WINRATE_FAKE_COMFORT
    ) {
      trustLabel = "FAKE_COMFORT_PICK";
      trustReason = `Most played champ, but ${winrate.toFixed(0)}% WR over ${s.games} games`;
    }
    // DO_NOT_ALLOW: enough games, clearly bad
    else if (
      s.games >= MIN_GAMES_MEANINGFUL &&
      winrate <= WINRATE_DO_NOT_ALLOW
    ) {
      trustLabel = "DO_NOT_ALLOW";
      trustReason = `${s.games} games, ${winrate.toFixed(0)}% WR — do not allow`;
    }
    // TRUSTED: enough games, positive WR, and not volatile.
    else if (
      s.games >= MIN_GAMES_TRUSTED &&
      winrate >= WINRATE_TRUSTED &&
      !isVolatile(winrate, recentWinrate)
    ) {
      trustLabel = "TRUSTED";
      trustReason = `${s.games} games, ${winrate.toFixed(0)}% WR — stable and reliable`;
    }
    // COINFLIP: meaningful sample but volatile/mixed profile.
    else if (s.games >= MIN_GAMES_MEANINGFUL && isVolatile(winrate, recentWinrate)) {
      trustLabel = "COINFLIP";
      trustReason =
        recentWinrate != null && Math.abs(recentWinrate - winrate) >= VOLATILE_SWING_DELTA
          ? `${s.games} games, ${winrate.toFixed(0)}% WR — volatile recent swing`
          : `${s.games} games, ${winrate.toFixed(0)}% WR — mixed results`;
    }
    // Small sample, high WR: pocket pick energy — fun label instead of "insufficient data"
    else if (
      s.games >= MIN_GAMES_TO_SHOW &&
      s.games < MIN_GAMES_MEANINGFUL &&
      winrate >= 60
    ) {
      trustLabel = "POCKET_PICK";
      trustReason = `${s.games} games, ${winrate.toFixed(0)}% WR — pocket pick energy?`;
    }
    // Meaningful sample but not strongly good or strongly bad = uncertain.
    else if (s.games >= MIN_GAMES_MEANINGFUL) {
      trustLabel = "COINFLIP";
      trustReason = `${s.games} games, ${winrate.toFixed(0)}% WR — not stable enough yet`;
    }
    // Small sample edge cases: too early to call.
    else {
      trustLabel = "INSUFFICIENT_DATA";
      trustReason = `${s.games} games, ${winrate.toFixed(0)}% WR — too early to call`;
    }

    results.push({
      championName: s.displayName,
      games: s.games,
      wins: s.wins,
      losses,
      winrate,
      avgKda,
      recentWinrate,
      trustLabel,
      trustReason,
      sampleQuality: sampleQuality(s.games),
    });
  }

  // Sort by games desc so most played appear first
  results.sort((a, b) => b.games - a.games);
  return results;
}
