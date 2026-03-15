/**
 * Champion Trust Classification — data-driven labels per champion for a player.
 * Uses only existing match/participant data; no Riot API. Reusable server-side.
 */

import type { MatchParticipantInput } from "@/lib/derived-stats";

// ------------ Tunable thresholds (easy to tweak) ------------
const MIN_GAMES_TO_SHOW = 3; // Below this we omit the champion from results
const MIN_GAMES_TRUSTED = 5;
const MIN_GAMES_MEANINGFUL = 5; // For DO_NOT_ALLOW / FAKE_COMFORT
const WINRATE_TRUSTED = 58; // % — "genuinely strong"
const WINRATE_DO_NOT_ALLOW = 40; // % — clearly bad idea
const WINRATE_FAKE_COMFORT = 45; // % — plays a lot but poor results
const WINRATE_COINFLIP_HIGH = 56; // Below TRUSTED, above = mixed
const WINRATE_COINFLIP_LOW = 42;
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
  return (name?.trim() && name) || "Unknown";
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
    });
  }
  return out;
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
  const stats = buildPerChampionStats(matches);
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
    // TRUSTED: enough games, strong and stable
    else if (
      s.games >= MIN_GAMES_TRUSTED &&
      winrate >= WINRATE_TRUSTED &&
      (recentWinrate == null || recentWinrate >= WINRATE_COINFLIP_LOW)
    ) {
      trustLabel = "TRUSTED";
      trustReason = `${s.games} games, ${winrate.toFixed(0)}% WR, stable`;
    }
    // COINFLIP: winrate in the mixed/unreliable band (42–56%) — actually inconsistent
    else if (
      s.games >= MIN_GAMES_TO_SHOW &&
      winrate > WINRATE_COINFLIP_LOW &&
      winrate < WINRATE_COINFLIP_HIGH
    ) {
      trustLabel = "COINFLIP";
      trustReason = `${s.games} games, ${winrate.toFixed(0)}% WR — mixed results`;
    }
    // Enough games but not trusted (e.g. 5+ games, 50% WR): inconsistent
    else if (s.games >= MIN_GAMES_MEANINGFUL && winrate < WINRATE_TRUSTED) {
      trustLabel = "COINFLIP";
      trustReason = `${s.games} games, ${winrate.toFixed(0)}% WR — inconsistent`;
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
    // Other small sample or edge cases: too early to call
    else {
      trustLabel = "INSUFFICIENT_DATA";
      trustReason = `${s.games} games, ${winrate.toFixed(0)}% WR — too early to call`;
    }

    results.push({
      championName,
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
