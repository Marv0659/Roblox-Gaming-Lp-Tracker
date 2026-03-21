/**
 * Rules-based copy for Ranked Wrapped — no AI. Inputs are plain numbers/labels from DB-derived stats.
 */

export interface PlayerNarrativeInput {
  gameName: string;
  rankedGames: number;
  netLp: number;
  overallWinrate: number | null;
  longestWinStreak: number;
  longestLossStreak: number;
  mostPlayedChampion: string | null;
  bestChampionName: string | null;
  worstChampionName: string | null;
  trustedChampion: string | null;
  fakeComfortChampion: string | null;
  peakTier: string;
  currentTier: string;
  rankDroppedFromPeak: boolean;
  bestDuoName: string | null;
  duoWinrate: number | null;
}

export interface PlayerNarrativeOut {
  funTitle: string;
  headline: string;
  lines: string[];
}

export interface GroupNarrativeInput {
  totalRankedGames: number;
  avgWinrate: number | null;
  biggestClimberName: string | null;
  biggestLpLoserName: string | null;
  mostGamesName: string | null;
}

export interface GroupNarrativeOut {
  headline: string;
  lines: string[];
}

// ------------ Tunable tone knobs ------------
const LP_CLIMB_BIG = 80;
const LP_DROP_BIG = -80;
const WR_HIGH = 56;
const WR_LOW = 44;
const GAMES_HEAVY = 40;
// -------------------------------------------

export function buildPlayerNarrative(i: PlayerNarrativeInput): PlayerNarrativeOut {
  const lines: string[] = [];

  // Title — priority: LP story > fraud > streaks > generic
  let funTitle = "Ranked protagonist";
  if (i.rankedGames < 5) {
    funTitle = "Sample size warrior";
  } else if (i.netLp >= LP_CLIMB_BIG) {
    funTitle = "LP mountain climber";
  } else if (i.netLp <= LP_DROP_BIG) {
    funTitle = "Gravity’s favorite student";
  } else if (i.fakeComfortChampion && i.mostPlayedChampion === i.fakeComfortChampion) {
    funTitle = "Comfort pick cosplayer";
  } else if (i.longestLossStreak >= 6) {
    funTitle = "Loss-streak archaeologist";
  } else if (i.longestWinStreak >= 6) {
    funTitle = "Win-streak speedrun enjoyer";
  } else if (i.overallWinrate != null && i.overallWinrate >= WR_HIGH && i.rankedGames >= GAMES_HEAVY) {
    funTitle = "Suspiciously consistent";
  } else if (i.overallWinrate != null && i.overallWinrate <= WR_LOW && i.rankedGames >= GAMES_HEAVY) {
    funTitle = "Brave queue scientist";
  }

  // Headline — one punchy sentence
  let headline = `${i.gameName} — a season in the trenches.`;
  if (i.trustedChampion && i.fakeComfortChampion) {
    headline = `A disciplined climber with one trusted pick and several bad ideas.`;
  } else if (i.rankDroppedFromPeak && i.peakTier !== i.currentTier) {
    headline = `Peaked in ${i.peakTier}, currently filing paperwork in ${i.currentTier}.`;
  } else if (i.netLp >= LP_CLIMB_BIG) {
    headline = `Net LP went up — the ladder noticed.`;
  } else if (i.netLp <= LP_DROP_BIG) {
    headline = `Net LP went down — the ladder sent a receipt.`;
  } else if (i.bestDuoName && i.duoWinrate != null && i.duoWinrate >= 58) {
    headline = `Queues best with ${i.bestDuoName} — chemistry beats mechanics.`;
  } else if (i.worstChampionName && i.mostPlayedChampion === i.worstChampionName) {
    headline = `Spent the season proving confidence is not a stat (${i.worstChampionName}).`;
  } else {
    headline = `Dominated in short bursts, then immediately investigated for fraud.`;
  }

  // Supporting lines — must reference real fields when possible
  if (i.mostPlayedChampion) {
    lines.push(`Most-played champion: ${i.mostPlayedChampion} — familiarity breeds contempt (for the enemy team, hopefully).`);
  }
  if (i.bestChampionName && i.worstChampionName && i.bestChampionName !== i.worstChampionName) {
    lines.push(`Best idea: ${i.bestChampionName}. Worst idea: ${i.worstChampionName}. We contain multitudes.`);
  }
  if (i.fakeComfortChampion) {
    lines.push(`“Comfort” pick audit: ${i.fakeComfortChampion} — the numbers would like a word.`);
  }
  if (i.trustedChampion) {
    lines.push(`Trusted constant: ${i.trustedChampion} — when in doubt, send the receipt.`);
  }
  if (i.longestWinStreak >= 4 || i.longestLossStreak >= 4) {
    lines.push(
      `Streak lore: ${i.longestWinStreak} wins in a row at best, ${i.longestLossStreak} losses at worst — cinema.`
    );
  }
  if (i.overallWinrate != null && i.rankedGames >= 10) {
    lines.push(`Overall ranked WR: ${i.overallWinrate.toFixed(1)}% across ${i.rankedGames} games — ${i.overallWinrate >= 52 ? "math is on your side." : "math is taking notes."}`);
  }

  // Trim to max 5 lines for scanability
  return {
    funTitle,
    headline,
    lines: lines.slice(0, 5),
  };
}

export function buildGroupNarrative(i: GroupNarrativeInput): GroupNarrativeOut {
  const lines: string[] = [];
  if (i.biggestClimberName) {
    lines.push(`${i.biggestClimberName} carried the LP spreadsheet uphill.`);
  }
  if (i.biggestLpLoserName && i.biggestLpLoserName !== i.biggestClimberName) {
    lines.push(`${i.biggestLpLoserName} taught everyone what sunk cost feels like.`);
  }
  if (i.mostGamesName) {
    lines.push(`${i.mostGamesName} touched grass the least — respectfully.`);
  }
  if (i.avgWinrate != null) {
    lines.push(`Squad blended winrate sits around ${i.avgWinrate.toFixed(1)}% — ${i.avgWinrate >= 51 ? "a team sport." : "a team coping mechanism."}`);
  }
  const headline =
    i.totalRankedGames >= 100
      ? "Your tracked squad logged a full Netflix season of ranked."
      : "The squad’s ranked season — equal parts stats and side-eye.";
  return {
    headline,
    lines: lines.slice(0, 5),
  };
}
