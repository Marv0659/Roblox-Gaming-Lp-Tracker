/**
 * THE BEASTEST — ultra-exclusive tag: only one person can hold it at a time.
 * To qualify: a 6-game uninterrupted win streak within 1 week, for 7 weeks in a row.
 * Holder = single qualifying player (most recent qualifier wins the tag).
 */

import { prisma } from "@/lib/db";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
const WEEKS_REQUIRED = 7;
const STREAK_REQUIRED = 6;

/** Match input for pure logic (gameStartAt, win). */
interface MatchInput {
  gameStartAt: Date;
  win: boolean;
}

/**
 * Split matches into 7 week buckets (week 0 = most recent 7 days, week 6 = 49–42 days ago).
 * Each week is [startMs, endMs) with endMs being "now" for week 0.
 */
function getWeekRanges(now: Date): { start: number; end: number }[] {
  const nowMs = now.getTime();
  const ranges: { start: number; end: number }[] = [];
  for (let w = 0; w < WEEKS_REQUIRED; w++) {
    const endMs = nowMs - w * DAYS_PER_WEEK * MS_PER_DAY;
    const startMs = endMs - DAYS_PER_WEEK * MS_PER_DAY;
    ranges.push({ start: startMs, end: endMs });
  }
  return ranges;
}

/** Returns true if this week's matches (chronological) contain 6 consecutive wins. */
function hasSixWinStreakInWeek(matchesInWeek: MatchInput[]): boolean {
  const sorted = [...matchesInWeek].sort(
    (a, b) => a.gameStartAt.getTime() - b.gameStartAt.getTime()
  );
  for (let i = 0; i <= sorted.length - STREAK_REQUIRED; i++) {
    const slice = sorted.slice(i, i + STREAK_REQUIRED);
    if (slice.every((m) => m.win)) return true;
  }
  return false;
}

/**
 * True if the player had a 6-game win streak in each of the last 7 weeks.
 * Uses rolling 7-day windows (week 0 = last 7 days, week 1 = 7–14 days ago, …).
 */
export function qualifiesForBeastest(
  matches: MatchInput[],
  now: Date = new Date()
): boolean {
  const ranges = getWeekRanges(now);
  const cutoff = now.getTime() - WEEKS_REQUIRED * DAYS_PER_WEEK * MS_PER_DAY;
  const inWindow = matches.filter((m) => m.gameStartAt.getTime() >= cutoff);
  if (inWindow.length < STREAK_REQUIRED * WEEKS_REQUIRED) return false;

  for (const range of ranges) {
    const inWeek = inWindow.filter((m) => {
      const t = m.gameStartAt.getTime();
      return t >= range.start && t < range.end;
    });
    if (!hasSixWinStreakInWeek(inWeek)) return false;
  }
  return true;
}

/**
 * Among qualifying players, pick the one who "claimed" the tag most recently:
 * the one whose 6-win streak in the most recent week (week 0) ended latest.
 * Returns null if no one qualifies.
 */
export function selectBeastestHolder(
  candidates: { id: string; gameName: string; tagLine: string; matches: MatchInput[] }[],
  now: Date = new Date()
): { id: string; gameName: string; tagLine: string } | null {
  const qualifiers = candidates.filter((c) => qualifiesForBeastest(c.matches, now));
  if (qualifiers.length === 0) return null;

  const week0End = now.getTime();
  const week0Start = week0End - DAYS_PER_WEEK * MS_PER_DAY;

  let best: (typeof qualifiers)[0] | null = null;
  let bestLastWinMs = 0;

  for (const p of qualifiers) {
    const inWeek0 = p.matches
      .filter((m) => {
        const t = m.gameStartAt.getTime();
        return t >= week0Start && t < week0End;
      })
      .sort((a, b) => a.gameStartAt.getTime() - b.gameStartAt.getTime());

    for (let i = 0; i <= inWeek0.length - STREAK_REQUIRED; i++) {
      const slice = inWeek0.slice(i, i + STREAK_REQUIRED);
      if (slice.every((m) => m.win)) {
        const lastWinMs = slice[slice.length - 1].gameStartAt.getTime();
        if (lastWinMs > bestLastWinMs) {
          bestLastWinMs = lastWinMs;
          best = p;
        }
        break;
      }
    }
  }

  return best ? { id: best.id, gameName: best.gameName, tagLine: best.tagLine } : null;
}

export const BEASTEST_TAG = "THE BEASTEST";

/** Tooltip for the tag. */
export const BEASTEST_TOOLTIP =
  "Ultimate exclusive: only one person can hold it. 6-game win streak in each of the last 7 weeks.";

/**
 * Fetches all tracked players' matches from the last 7 weeks and returns the current BEASTEST holder (or null).
 */
export async function getBeastestHolder(): Promise<{
  id: string;
  gameName: string;
  tagLine: string;
} | null> {
  const now = new Date();
  const since = new Date(now.getTime() - WEEKS_REQUIRED * DAYS_PER_WEEK * MS_PER_DAY);

  const players = await prisma.trackedPlayer.findMany({
    include: {
      matchParticipants: {
        where: { match: { gameStartAt: { gte: since } } },
        include: { match: { select: { gameStartAt: true } } },
      },
    },
  });

  const candidates = players.map((p) => ({
    id: p.id,
    gameName: p.gameName,
    tagLine: p.tagLine,
    matches: p.matchParticipants.map((m) => ({
      gameStartAt: m.match.gameStartAt,
      win: m.win,
    })),
  }));

  return selectBeastestHolder(candidates, now);
}
