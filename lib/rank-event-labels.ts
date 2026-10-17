/**
 * Human-readable labels for rank event types and event description text.
 */

import type { RankEventType } from "@/lib/rank-events";
import type { RankEventDisplay } from "@/lib/rank-events";
import { prettyTier } from "@/lib/rank-utils";

export const RANK_EVENT_LABELS: Record<RankEventType, string> = {
  PLACED: "Placed",
  PROMOTED: "Promoted",
  DEMOTED: "Demoted",
  NEW_PEAK: "New peak",
  REACHED_100_LP: "Reached 100 LP",
};

/** Formats a single rank for display (e.g. "Gold II 75 LP"). */
export function formatRank(tier: string, rank: string, lp: number): string {
  const div = rank ? ` ${rank}` : "";
  return `${tier}${div} ${lp} LP`;
}

/**
 * Returns a short description of the event for display (e.g. "Promoted from Gold II to Gold I").
 */
export function getRankEventDescription(e: RankEventDisplay): string {
  const after = formatRank(e.tierAfter, e.rankAfter, e.leaguePointsAfter);
  switch (e.eventType) {
    case "PLACED":
      return `Placed ${after}`;
    case "PROMOTED":
      return e.tierBefore && e.rankBefore != null
        ? `Promoted from ${formatRank(e.tierBefore, e.rankBefore, e.leaguePointsBefore ?? 0)} to ${after}`
        : `Promoted to ${after}`;
    case "DEMOTED":
      return e.tierBefore && e.rankBefore != null
        ? `Demoted from ${formatRank(e.tierBefore, e.rankBefore, e.leaguePointsBefore ?? 0)} to ${after}`
        : `Demoted to ${after}`;
    case "NEW_PEAK":
      return `New peak: ${after}`;
    case "REACHED_100_LP":
      return `Reached 100 LP (${e.tierAfter} ${e.rankAfter})`;
    default:
      return after;
  }
}

/** Short badge + sentence used by the dashboard feed and player milestones. */
export function describeRankEvent(e: RankEventDisplay): {
  kind: string;
  tone: "up" | "down" | "peak";
  text: string;
} {
  const rank = prettyTier(e.tierAfter, e.rankAfter);
  const queue = e.queueType === "RANKED_FLEX_SR" ? " in Flex" : "";
  switch (e.eventType) {
    case "PROMOTED":
      return { kind: "Up", tone: "up", text: `promoted to ${rank}${queue}` };
    case "DEMOTED":
      return { kind: "Down", tone: "down", text: `dropped to ${rank}${queue}` };
    case "NEW_PEAK":
      return { kind: "Peak", tone: "peak", text: `new peak — ${rank} ${e.leaguePointsAfter} LP${queue}` };
    case "PLACED":
      return { kind: "Placed", tone: "peak", text: `placed in ${rank}${queue}` };
    default:
      return { kind: "100 LP", tone: "up", text: `hit 100 LP in ${rank}${queue}` };
  }
}
