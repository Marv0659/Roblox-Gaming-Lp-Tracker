/**
 * Funny player titles/badges and rough-patch summary from derived stats.
 * Pure functions; no DB. Tune thresholds below to change when badges appear.
 */

import type { DerivedPlayerStats } from "@/lib/derived-stats";

// ------------ Tune these thresholds ------------
const LP_GAIN_30D_STRONG = 50;
const LP_GAIN_7D_STRONG = 25;
const LP_LOSS_7D_ROUGH = -30;
const WINRATE_HOT = 70;
const WINRATE_COLD = 35;
const WIN_STREAK_HOT = 4;
const LOSS_STREAK_ROUGH = 4;
const GAMES_7D_GRINDER = 10;
const STUBBORN_CHAMP_MIN_GAMES = 4;
const STUBBORN_CHAMP_MAX_WR = 40;
// ----------------------------------------------

/**
 * Returns a list of funny badge/title strings for the player based on funStats.
 * Order: positive badges first, then neutral, then "rough" ones.
 */
export function getPlayerBadges(stats: DerivedPlayerStats): string[] {
  const badges: string[] = [];

  if (stats.lpGained30d >= LP_GAIN_30D_STRONG) {
    badges.push("LP Machine");
  }
  if (stats.lpGained7d >= LP_GAIN_7D_STRONG) {
    badges.push("Climbing");
  }
  if (stats.currentWinStreak >= WIN_STREAK_HOT) {
    badges.push("On a Heater");
  }
  if (stats.winrateLast20 != null && stats.winrateLast20 >= WINRATE_HOT) {
    badges.push("Hot Hand");
  }
  if (stats.totalGamesLast7d >= GAMES_7D_GRINDER) {
    badges.push("Grinder");
  }
  if (stats.bestChampionByWinrate && stats.bestChampionByWinrate.games >= 5) {
    badges.push("One-Trick Energy");
  }
  if (stats.mostPlayedChampion && stats.worstChampionByWinrate) {
    const worst = stats.worstChampionByWinrate;
    if (
      worst.games >= STUBBORN_CHAMP_MIN_GAMES &&
      worst.winrate <= STUBBORN_CHAMP_MAX_WR
    ) {
      badges.push("Stubborn");
    }
  }
  if (stats.lpGained7d <= LP_LOSS_7D_ROUGH && stats.lpGained7d !== 0) {
    badges.push("LP Bleeder");
  }
  if (stats.currentLossStreak >= LOSS_STREAK_ROUGH) {
    badges.push("Cold Streak");
  }
  if (stats.winrateLast20 != null && stats.winrateLast20 <= WINRATE_COLD) {
    badges.push("Rough Patch");
  }

  return badges;
}

/** Hover tooltips for each funny title badge. */
export const BADGE_TOOLTIPS: Record<string, string> = {
  "LP Machine": "Gained 50+ LP in the last 30 days.",
  Climbing: "Gained 25+ LP in the last 7 days.",
  "On a Heater": "Currently on a 4+ win streak.",
  "Hot Hand": "70%+ win rate over the last 20 games.",
  Grinder: "Played 10+ ranked games in the last 7 days.",
  "One-Trick Energy": "One champion with 5+ games and a strong win rate.",
  Stubborn: "Still picking a champion with low win rate after several games.",
  "LP Bleeder": "Lost 30+ LP in the last 7 days.",
  "Cold Streak": "Currently on a 4+ loss streak.",
  "Rough Patch": "35% or lower win rate over the last 20 games.",
};

export type RoughPatchSeverity = "low" | "medium" | "high";

export interface RoughPatchSummary {
  summary: string;
  severity: RoughPatchSeverity;
}

/**
 * Returns a short "rough patch" / fraud-index style summary when recent
 * performance is bad enough; otherwise null. Used for the optional summary card.
 */
export function getRoughPatchSummary(
  stats: DerivedPlayerStats
): RoughPatchSummary | null {
  const reasons: string[] = [];

  if (stats.lpGained7d <= LP_LOSS_7D_ROUGH && stats.lpGained7d !== 0) {
    reasons.push(`${stats.lpGained7d} LP in 7 days`);
  }
  if (stats.winrateLast20 != null && stats.winrateLast20 < 40) {
    reasons.push(`${stats.winrateLast20.toFixed(0)}% WR (last 20)`);
  }
  if (stats.currentLossStreak >= 3) {
    reasons.push(`L${stats.currentLossStreak} streak`);
  }
  if (
    stats.worstChampionByWinrate &&
    stats.worstChampionByWinrate.games >= STUBBORN_CHAMP_MIN_GAMES &&
    stats.worstChampionByWinrate.winrate <= STUBBORN_CHAMP_MAX_WR
  ) {
    reasons.push(
      `${stats.worstChampionByWinrate.championName} ${stats.worstChampionByWinrate.winrate.toFixed(0)}% (${stats.worstChampionByWinrate.games} games)`
    );
  }

  if (reasons.length === 0) return null;

  const summary = reasons.join(" · ");
  let severity: RoughPatchSeverity = "low";
  if (reasons.length >= 3) severity = "high";
  else if (reasons.length >= 2) severity = "medium";

  return { summary, severity };
}
