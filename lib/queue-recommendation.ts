/**
 * "Should you queue?" recommendation engine.
 * Pure, rules-based, and built only from existing derived stats + match data.
 */

import type { PlayerFunStats, PlayerDetail } from "@/lib/leaderboard";
import type { ChampionTrustResult } from "@/lib/champion-trust";
import {
  type MatchParticipantInput,
  withoutRemakes,
  winrateLastN,
} from "@/lib/derived-stats";

// ------------ Tunable thresholds / weights (easy to tweak) ------------

const RECENT_GAMES_FOR_FORM = 20;
const MIN_GAMES_FOR_STRONG_OPINION = 10;
const MIN_GAMES_FOR_MEDIUM_OPINION = 5;

const GOOD_WINRATE_LAST20 = 60;
const BAD_WINRATE_LAST20 = 45;
const HOT_STREAK_WINS = 4;
const COLD_STREAK_LOSSES = 4;

const LP_GAIN_GOOD_7D = 40;
const LP_LOSS_BAD_7D = -30;

const LATE_NIGHT_START_HOUR = 23; // 23:00
const LATE_NIGHT_END_HOUR = 5; // 05:00
const MIN_LATE_NIGHT_GAMES = 8;
const LATE_NIGHT_PENALTY_THRESHOLD_DIFF = 10; // % WR worse at night

const GRIND_WINDOW_HOURS = 24;
const GRIND_GAMES_THRESHOLD = 12;

const TILT_LOSS_STREAK_HARD = 5;
const TILT_LOSS_STREAK_SOFT = 3;

const BAD_CHAMP_SPAM_RECENT_GAMES = 8;

const BASE_SCORE = 50;
const SCORE_BONUS_GOOD_FORM = 20;
const SCORE_PENALTY_BAD_FORM = 25;
const SCORE_BONUS_HOT_STREAK = 10;
const SCORE_PENALTY_TILT = 25;
const SCORE_PENALTY_LATE_NIGHT = 15;
const SCORE_PENALTY_GRIND = 10;
const SCORE_PENALTY_BAD_CHAMP = 20;

// ----------------------------------------------------------------------

export type QueueRecommendationLabel =
  | "YES"
  | "NO"
  | "ONLY_WITH_SUPERVISION"
  | "ONLY_IF_NOT_LOCKING_THAT_CHAMP"
  | "ABSOLUTELY_NOT";

export interface QueueRecommendationFactor {
  type:
    | "recent_form"
    | "streak"
    | "lp_trend"
    | "late_night"
    | "grind"
    | "champion_trust"
    | "sample_size";
  label: string;
  impact: "positive" | "negative" | "neutral";
}

export interface QueueRecommendationResult {
  playerId: string;
  recommendationLabel: QueueRecommendationLabel;
  /** 0–100: higher means more green light to queue. */
  recommendationScore: number;
  /** 0–1: how confident we are given sample size / consistency. */
  confidence: number;
  shortReason: string;
  factors?: QueueRecommendationFactor[];
  championWarning?: string;
  queueCurfewWarning?: string;
  warningTags?: string[];
  /** If recommendationLabel is ONLY_IF_NOT_LOCKING_THAT_CHAMP, this is the champion name. */
  badChampionName?: string;
}

export interface QueueRecommendationConfig {
  lateNightStartHour: number;
  lateNightEndHour: number;
}

export const DEFAULT_QUEUE_RECOMMENDATION_CONFIG: QueueRecommendationConfig = {
  lateNightStartHour: LATE_NIGHT_START_HOUR,
  lateNightEndHour: LATE_NIGHT_END_HOUR,
};

function toMatchInputFromRecent(
  matches: PlayerDetail["recentMatches"]
): MatchParticipantInput[] {
  return matches.map((m) => ({
    win: m.win,
    championName: m.championName,
    kills: m.kills,
    deaths: m.deaths,
    assists: m.assists,
    gameStartAt: m.gameStartAt,
    gameDuration: m.gameDuration,
  }));
}

function isLateNight(date: Date, config: QueueRecommendationConfig): boolean {
  const h = date.getHours();
  if (config.lateNightStartHour <= config.lateNightEndHour) {
    return h >= config.lateNightStartHour && h < config.lateNightEndHour;
  }
  return h >= config.lateNightStartHour || h < config.lateNightEndHour;
}

function computeLateNightPattern(
  matches: MatchParticipantInput[],
  config: QueueRecommendationConfig
): {
  hasPattern: boolean;
  lateNightWinrate: number | null;
  nonLateWinrate: number | null;
} {
  if (matches.length === 0) {
    return { hasPattern: false, lateNightWinrate: null, nonLateWinrate: null };
  }

  const lateNightMatches: MatchParticipantInput[] = [];
  const nonLateMatches: MatchParticipantInput[] = [];

  for (const m of matches) {
    if (isLateNight(m.gameStartAt, config)) lateNightMatches.push(m);
    else nonLateMatches.push(m);
  }

  const wins = (list: MatchParticipantInput[]) =>
    list.filter((m) => m.win).length;

  const lateGames = lateNightMatches.length;
  const nonLateGames = nonLateMatches.length;

  const lateNightWinrate =
    lateGames > 0 ? (wins(lateNightMatches) / lateGames) * 100 : null;
  const nonLateWinrate =
    nonLateGames > 0 ? (wins(nonLateMatches) / nonLateGames) * 100 : null;

  const hasPattern =
    lateGames >= MIN_LATE_NIGHT_GAMES &&
    nonLateWinrate !== null &&
    lateNightWinrate !== null &&
    nonLateWinrate - lateNightWinrate >= LATE_NIGHT_PENALTY_THRESHOLD_DIFF;

  return { hasPattern, lateNightWinrate, nonLateWinrate };
}

function computeGrindStats(
  matches: MatchParticipantInput[],
  now: Date
): { recentGames24h: number; isGrinding: boolean } {
  const cutoff = new Date(now.getTime() - GRIND_WINDOW_HOURS * 60 * 60 * 1000);
  const recent = matches.filter(
    (m) => m.gameStartAt.getTime() >= cutoff.getTime()
  );
  return {
    recentGames24h: recent.length,
    isGrinding: recent.length >= GRIND_GAMES_THRESHOLD,
  };
}

function findBadChampionSpam(
  championTrust: ChampionTrustResult[],
  matches: MatchParticipantInput[]
): { warning?: string; hasBadSpam: boolean; championName?: string } {
  const badLabels = new Set<ChampionTrustResult["trustLabel"]>([
    "DO_NOT_ALLOW",
    "FAKE_COMFORT_PICK",
  ]);

  const badChamps = championTrust.filter((c) => badLabels.has(c.trustLabel));
  if (badChamps.length === 0) return { hasBadSpam: false };

  const recent = matches.slice(0, BAD_CHAMP_SPAM_RECENT_GAMES);
  const nameCounts = new Map<string, number>();
  for (const m of recent) {
    const name = m.championName;
    if (!name) continue;
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }

  let worstName: string | null = null;
  let worstCount = 0;
  for (const c of badChamps) {
    const count = nameCounts.get(c.championName) ?? 0;
    if (count > worstCount) {
      worstCount = count;
      worstName = c.championName;
    }
  }

  if (!worstName || worstCount < 3) return { hasBadSpam: false };

  const meta = badChamps.find((c) => c.championName === worstName);
  const label = meta?.trustLabel ?? "DO_NOT_ALLOW";
  const labelText =
    label === "FAKE_COMFORT_PICK"
      ? "fake comfort pick"
      : "do-not-allow champion";

  return {
    hasBadSpam: true,
    warning: `You keep locking ${worstName}, a ${labelText}`,
    championName: worstName,
  };
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function inferLabel(
  score: number,
  opts: {
    isTiltHard: boolean;
    isTiltSoft: boolean;
    isLateNightNow: boolean;
    hasBadChampionSpam: boolean;
  }
): QueueRecommendationLabel {
  if (opts.isTiltHard && opts.isLateNightNow) {
    return "ABSOLUTELY_NOT";
  }
  if (score <= 25 || (opts.isTiltHard && !opts.isLateNightNow)) {
    return "NO";
  }
  if (opts.hasBadChampionSpam && score >= 30 && score <= 65) {
    return "ONLY_IF_NOT_LOCKING_THAT_CHAMP";
  }
  if (score >= 70 && !opts.isTiltSoft && !opts.isTiltHard) {
    return "YES";
  }
  return "ONLY_WITH_SUPERVISION";
}

function computeConfidence(totalGames: number): number {
  if (totalGames >= 60) return 0.95;
  if (totalGames >= 40) return 0.85;
  if (totalGames >= 20) return 0.7;
  if (totalGames >= 10) return 0.5;
  if (totalGames >= 5) return 0.35;
  return 0.2;
}

function shortReasonFromFactors(
  label: QueueRecommendationLabel,
  factors: QueueRecommendationFactor[],
  funStats: PlayerFunStats,
  tiltInfo: { lossStreak: number; lp7d: number },
  badChampSpam?: { warning?: string; hasBadSpam: boolean; championName?: string }
): string {
  if (label === "YES") {
    const wr20 = funStats.winrateLast20;
    if (wr20 != null && wr20 >= GOOD_WINRATE_LAST20) {
      return `Won ${wr20.toFixed(0)}% of last 20 and gaining LP`;
    }
    return "Recent form is solid and LP trend is up";
  }

  if (label === "ABSOLUTELY_NOT") {
    if (tiltInfo.lossStreak >= TILT_LOSS_STREAK_HARD) {
      return `On a ${tiltInfo.lossStreak}-game loss streak after midnight`;
    }
    return "Late-night + hard tilt detected — statistically unsafe to queue";
  }

  if (label === "ONLY_IF_NOT_LOCKING_THAT_CHAMP" && badChampSpam?.championName) {
    return `Playable, but only if you do not lock ${badChampSpam.championName}`;
  }

  if (label === "NO") {
    if (tiltInfo.lossStreak >= TILT_LOSS_STREAK_SOFT) {
      return `Recent form is bad and you are on a ${tiltInfo.lossStreak}-game loss streak`;
    }
    if (tiltInfo.lp7d <= LP_LOSS_BAD_7D) {
      return `${tiltInfo.lp7d} LP over the last 7 days — maybe touch grass first`;
    }
    return "Recent form is poor and LP trend is down";
  }

  if (label === "ONLY_WITH_SUPERVISION") {
    return "Borderline data — bring a duo or coach if you queue";
  }

  return "Mixed signals — queue carefully";
}

export function getQueueRecommendationForPlayer(
  player: PlayerDetail,
  now: Date = new Date(),
  config: QueueRecommendationConfig = DEFAULT_QUEUE_RECOMMENDATION_CONFIG
): QueueRecommendationResult {
  const matchesInput = toMatchInputFromRecent(player.recentMatches);
  const matches = withoutRemakes(matchesInput);

  const totalGames = matches.length;
  const factors: QueueRecommendationFactor[] = [];
  const warningTags: string[] = [];

  let score = BASE_SCORE;

  const last5Winrate = winrateLastN(matches, 5);
  const last10Winrate = winrateLastN(matches, 10);
  const last20Winrate = winrateLastN(matches, RECENT_GAMES_FOR_FORM);

  if (last20Winrate != null && totalGames >= MIN_GAMES_FOR_STRONG_OPINION) {
    if (last20Winrate >= GOOD_WINRATE_LAST20) {
      score += SCORE_BONUS_GOOD_FORM;
      factors.push({
        type: "recent_form",
        label: `Hot recent form (${last20Winrate.toFixed(0)}% over last 20)`,
        impact: "positive",
      });
    } else if (last20Winrate <= BAD_WINRATE_LAST20) {
      score -= SCORE_PENALTY_BAD_FORM;
      factors.push({
        type: "recent_form",
        label: `Cold recent form (${last20Winrate.toFixed(0)}% over last 20)`,
        impact: "negative",
      });
    }
  }

  const fun = player.funStats;
  if (fun.currentWinStreak >= HOT_STREAK_WINS) {
    score += SCORE_BONUS_HOT_STREAK;
    factors.push({
      type: "streak",
      label: `On a W${fun.currentWinStreak} streak`,
      impact: "positive",
    });
  }

  const isTiltHard = fun.currentLossStreak >= TILT_LOSS_STREAK_HARD;
  const isTiltSoft = fun.currentLossStreak >= TILT_LOSS_STREAK_SOFT;
  if (isTiltSoft) {
    score -= SCORE_PENALTY_TILT;
    factors.push({
      type: "streak",
      label: `On a L${fun.currentLossStreak} streak`,
      impact: "negative",
    });
    warningTags.push("Tilt detected");
  }

  if (fun.lpGained7d >= LP_GAIN_GOOD_7D) {
    factors.push({
      type: "lp_trend",
      label: `Gained ${fun.lpGained7d} LP in last 7 days`,
      impact: "positive",
    });
  } else if (fun.lpGained7d <= LP_LOSS_BAD_7D) {
    score -= 10;
    factors.push({
      type: "lp_trend",
      label: `${fun.lpGained7d} LP in last 7 days`,
      impact: "negative",
    });
  }

  const lateNightPattern = computeLateNightPattern(matches, config);
  const isLateNightNow = isLateNight(now, config);
  let queueCurfewWarning: string | undefined;
  if (lateNightPattern.hasPattern && isLateNightNow) {
    score -= SCORE_PENALTY_LATE_NIGHT;
    warningTags.push("Late-night danger");
    queueCurfewWarning = "You are statistically a public risk after 23:30";
    factors.push({
      type: "late_night",
      label: "Historically worse performance in late-night games",
      impact: "negative",
    });
  }

  const grindStats = computeGrindStats(matches, now);
  if (grindStats.isGrinding) {
    score -= SCORE_PENALTY_GRIND;
    warningTags.push("Grinding too many games");
    factors.push({
      type: "grind",
      label: `${grindStats.recentGames24h} games in the last 24h`,
      impact: "negative",
    });
  }

  const badChampSpam = findBadChampionSpam(
    player.championTrust,
    matches
  );
  let championWarning: string | undefined;
  let badChampionName: string | undefined;
  if (badChampSpam.hasBadSpam && badChampSpam.warning) {
    score -= SCORE_PENALTY_BAD_CHAMP;
    championWarning = badChampSpam.warning;
    badChampionName = badChampSpam.championName;
    warningTags.push("Fake comfort pick risk");
    factors.push({
      type: "champion_trust",
      label: badChampSpam.warning,
      impact: "negative",
    });
  }

  if (totalGames < MIN_GAMES_FOR_MEDIUM_OPINION) {
    factors.push({
      type: "sample_size",
      label: "Very low sample size — recommendation is gentle",
      impact: "neutral",
    });
  }

  const finalScore = clampScore(score);

  const label = inferLabel(finalScore, {
    isTiltHard,
    isTiltSoft,
    isLateNightNow,
    hasBadChampionSpam: badChampSpam.hasBadSpam,
  });

  const confidence = computeConfidence(totalGames);

  const shortReason = shortReasonFromFactors(
    label,
    factors,
    fun,
    { lossStreak: fun.currentLossStreak, lp7d: fun.lpGained7d },
    badChampSpam
  );

  return {
    playerId: player.id,
    recommendationLabel: label,
    recommendationScore: finalScore,
    confidence,
    shortReason,
    factors,
    championWarning,
    queueCurfewWarning,
    warningTags: warningTags.length > 0 ? warningTags : undefined,
    badChampionName,
  };
}

