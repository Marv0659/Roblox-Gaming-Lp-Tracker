"use client";

import Link from "next/link";
import type { RankEventDisplay, RankEventType } from "@/lib/rank-events";
import { RANK_EVENT_LABELS } from "@/lib/rank-event-labels";
import { tierColor } from "@/lib/tier-colors";
import { SOLO_QUEUE, FLEX_QUEUE } from "@/lib/leaderboard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function queueLabel(queueType: string): string {
  if (queueType === SOLO_QUEUE) return "Solo";
  if (queueType === FLEX_QUEUE) return "Flex";
  return queueType.replace("RANKED_", "").replace(/_/g, " ");
}

interface RecentRankEventsProps {
  events: RankEventDisplay[];
  /** Show player name and link to player (dashboard). When false, show only event (player page). */
  showPlayerName?: boolean;
  /** Optional card title (e.g. "Recent Ranked Events") */
  title?: string;
  /** Optional empty state message */
  emptyMessage?: string;
}

const EVENT_TYPE_STYLES: Record<RankEventType, string> = {
  PLACED: "text-muted-foreground",
  PROMOTED: "text-emerald-600 dark:text-emerald-400",
  DEMOTED: "text-destructive",
  NEW_PEAK: "text-amber-600 dark:text-amber-400",
  REACHED_100_LP: "text-primary",
};

function EventChip({
  e,
  showPlayerName,
}: {
  e: RankEventDisplay;
  showPlayerName: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm",
        "flex-shrink-0"
      )}
    >
      <span
        className={cn(
          "rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
          e.queueType === FLEX_QUEUE && "bg-amber-500/15 text-amber-700 dark:text-amber-400/90",
          e.queueType === SOLO_QUEUE && "bg-primary/10 text-primary"
        )}
        title={e.queueType === SOLO_QUEUE ? "Solo / Duo" : e.queueType === FLEX_QUEUE ? "Flex 5v5" : e.queueType}
      >
        {queueLabel(e.queueType)}
      </span>
      <span
        className={cn(
          "font-medium",
          EVENT_TYPE_STYLES[e.eventType as RankEventType]
        )}
      >
        {RANK_EVENT_LABELS[e.eventType as RankEventType]}
      </span>
      {showPlayerName && e.gameName != null && (
        <Link
          href={`/players/${e.trackedPlayerId}`}
          className="font-medium text-primary hover:underline"
        >
          {e.gameName}#{e.tagLine ?? ""}
        </Link>
      )}
      <span className="text-muted-foreground">·</span>
      <span className={cn("font-medium", tierColor(e.tierAfter))}>
        {e.tierAfter} {e.rankAfter} {e.leaguePointsAfter} LP
      </span>
      <span suppressHydrationWarning className="text-xs text-muted-foreground">
        {typeof e.createdAt === "string"
          ? new Date(e.createdAt).toLocaleDateString("en-GB")
          : e.createdAt.toLocaleDateString("en-GB")}
      </span>
    </span>
  );
}

export function RecentRankEvents({
  events,
  showPlayerName = false,
  title,
  emptyMessage = "No rank events yet. Sync players to detect placements, promos, and demotions.",
}: RecentRankEventsProps) {
  const displayed = events.slice(0, 4);
  const content =
    displayed.length === 0 ? (
      <p className="py-3 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    ) : (
      <div
        className="flex flex-wrap gap-3 py-1"
        aria-label="Recent ranked events"
      >
        {displayed.map((e) => (
          <EventChip
            key={e.id}
            e={e}
            showPlayerName={showPlayerName}
          />
        ))}
      </div>
    );

  if (title) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{title}</h2>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return content;
}
