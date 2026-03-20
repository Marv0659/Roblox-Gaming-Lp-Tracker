"use client";

import Link from "next/link";
import type { RecentMatchFeedItem } from "@/lib/leaderboard";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatRelative(date: Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function queueLabel(queueId: number): string {
  if (queueId === 420) return "Solo/Duo";
  if (queueId === 440) return "Flex";
  return "Ranked";
}

function FeedChip({ item }: { item: RecentMatchFeedItem }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs">
      <Link
        href={`/players/${item.trackedPlayerId}`}
        className="font-medium text-primary hover:underline"
      >
        {item.gameName}
      </Link>
      <Link
        href={`/matches/${item.matchDbId}`}
        className="flex items-center gap-1.5 transition-colors hover:text-foreground hover:opacity-90"
      >
        <span
          className={cn(
            "rounded px-1 py-0.5 text-[10px] font-medium",
            item.gameDuration < 210
              ? "bg-muted text-muted-foreground"
              : item.win
              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/20 text-destructive"
          )}
        >
          {item.gameDuration < 210 ? "R" : item.win ? "W" : "L"}
        </span>
        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {queueLabel(item.queueId)}
        </span>
        <span className="text-muted-foreground">{item.championName ?? "—"}</span>
        <span className="text-muted-foreground tabular-nums">
          {item.kills}/{item.deaths}/{item.assists}
        </span>
        <span suppressHydrationWarning className="text-muted-foreground/80" title={new Date(item.gameStartAt).toLocaleString()}>
          {formatRelative(item.gameStartAt)}
        </span>
      </Link>
    </div>
  );
}

interface RecentMatchFeedProps {
  items: RecentMatchFeedItem[];
  title?: string;
  emptyMessage?: string;
  maxItems?: number;
}

export function RecentMatchFeed({
  items,
  title = "Recent games",
  emptyMessage = "No games yet. Sync players to fetch recent ranked matches.",
  maxItems = 4,
}: RecentMatchFeedProps) {
  const displayed = items.slice(0, maxItems);
  const content =
    displayed.length === 0 ? (
      <p className="py-2 text-center text-xs text-muted-foreground">{emptyMessage}</p>
    ) : (
      <div className="flex flex-wrap items-center gap-2" aria-label="Recent wins and losses">
        {displayed.map((item) => (
          <FeedChip key={`${item.matchDbId}-${item.trackedPlayerId}`} item={item} />
        ))}
      </div>
    );

  return (
    <Card className="border-border/80">
      <CardContent className="py-3 pl-4 pr-4">
        <h2 className="mb-2 text-base font-semibold text-foreground">{title}</h2>
        {content}
      </CardContent>
    </Card>
  );
}
