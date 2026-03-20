import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { tierColor, tierGlowClass } from "@/lib/tier-colors";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RankBadge } from "@/components/rank-badge";
import { cn } from "@/lib/utils";

interface Props {
  entry: LeaderboardEntry;
  index: number;
}

function rankToDivision(rank?: string | null): string {
  switch ((rank ?? "").toUpperCase()) {
    case "I":
      return "1";
    case "II":
      return "2";
    case "III":
      return "3";
    case "IV":
      return "4";
    default:
      return "";
  }
}

/**
 * Mobile-first leaderboard card: no horizontal scroll, all key info at a glance,
 * single clear CTA. Used only on small viewports; table is shown on md+.
 */
export function LeaderboardCard({ entry, index }: Props) {
  const glow = tierGlowClass(entry.tier);
  const division = rankToDivision(entry.rank);
  return (
    <Link href={`/players/${entry.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg">
      <Card className="relative overflow-hidden transition-colors hover:bg-muted/30 active:bg-muted/50">
        {/* Decorative tier glow */}
        {glow && (
          <div
            className={cn(
              "pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full blur-2xl",
              glow
            )}
          />
        )}
        <CardContent className="relative z-10 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium tabular-nums text-muted-foreground shrink-0">
                  #{index + 1}
                </span>
                <span className="truncate text-sm font-semibold text-foreground">
                  {entry.gameName}
                  <span className="font-normal text-muted-foreground">#{entry.tagLine}</span>
                </span>
                <Badge variant="secondary" className="shrink-0 text-[10px] font-normal uppercase leading-tight" title="Region">
                  {entry.region}
                </Badge>
              </div>
              <div className="mt-0.5 flex items-center gap-0" title="Rank badge and tier">
                
                <RankBadge tier={entry.tier} className="h-20 w-20" />
                <span className={cn("-ml-3 text-base font-semibold", tierColor(entry.tier))}>
                  {entry.tier}
                  {division ? ` ${division}` : ""}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <span className="font-medium text-emerald-500">{entry.wins}</span>
                <span className="text-muted-foreground"> W / </span>
                <span className="font-medium text-destructive">{entry.losses}</span>
                <span className="text-muted-foreground"> L</span>
                {entry.winrate != null && (
                  <>
                    <span className="text-muted-foreground"> · </span>
                    <span
                      className={cn(
                        "font-medium",
                        entry.winrate >= 55
                          ? "text-emerald-500"
                          : entry.winrate < 45
                          ? "text-destructive"
                          : "text-foreground"
                      )}
                    >
                      {entry.winrate.toFixed(1)}% WR
                    </span>
                  </>
                )}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-primary">View →</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
