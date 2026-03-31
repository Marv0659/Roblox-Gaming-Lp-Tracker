import Link from "next/link";
import { getLeaderboard, getLeaderboardRegions, getRecentMatchFeed } from "@/lib/leaderboard";
import { getBeastestHolder, BEASTEST_TOOLTIP } from "@/lib/beastest";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { RecentMatchFeed } from "@/components/recent-match-feed";
import { RankBadge } from "@/components/rank-badge";
import { LeaderboardFilters } from "./leaderboard-filters";
import { SyncAllButton } from "../players/sync-all-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Crown, Users } from "lucide-react";

export const dynamic = "force-dynamic";

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; queue?: string }>;
}) {
  const params = await searchParams;
  const filters = {
    region: params.region || undefined,
    queue: params.queue || undefined,
  };
  const [entries, regions, recentMatches, beastestHolder] = await Promise.all([
    getLeaderboard(filters),
    getLeaderboardRegions(),
    getRecentMatchFeed(20),
    getBeastestHolder(),
  ]);

  const totalPlayers = entries.length;
  const topEntry = entries[0];
  const topDivision = topEntry ? rankToDivision(topEntry.rank) : "";
  const winrateEntries = entries.filter((e) => e.winrate != null);
  const averageWinrate =
    winrateEntries.length > 0
      ? winrateEntries.reduce((sum, e) => sum + (e.winrate ?? 0), 0) / winrateEntries.length
      : null;

  return (
    <div className="relative p-4 sm:p-6 md:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-40 max-w-5xl bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%)] blur-2xl" />
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Friends leaderboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live ranked snapshot from your tracked players.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {totalPlayers > 0 && <SyncAllButton />}
          <LeaderboardFilters regions={regions} />
        </div>
      </div>

      {totalPlayers > 0 && (
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border/60 bg-gradient-to-br from-background via-background to-sky-500/5">
            <CardContent className="flex items-baseline justify-between gap-2 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    Tracked players
                  </span>
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {totalPlayers}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                Private lobby
              </Badge>
            </CardContent>
          </Card>

          {topEntry && (
            <Card className="border-border/60">
              <CardContent className="flex flex-col justify-between gap-0.5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5 text-amber-400" aria-hidden />
                    Current #1
                  </span>
                </p>
                <p className="mt-1 truncate text-sm font-semibold">
                  {topEntry.gameName}
                  <span className="font-normal text-muted-foreground">
                    #{topEntry.tagLine}
                  </span>
                </p>
                <div className="mt-0.5 flex items-center gap-0 text-xs text-muted-foreground">
                  <RankBadge tier={topEntry.tier} className="h-20 w-20" />
                  <span className="-ml-3 text-base font-semibold">
                    {topEntry.tier}
                    {topDivision ? ` ${topDivision}` : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60">
            <CardContent className="flex flex-col justify-between gap-1 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" aria-hidden />
                  Average winrate
                </span>
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {averageWinrate != null ? `${averageWinrate.toFixed(1)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                Across players with recorded games.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {beastestHolder && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge
            className="bg-amber-500/90 font-semibold text-black hover:bg-amber-500"
            title={BEASTEST_TOOLTIP}
          >
            THE BEASTEST
          </Badge>
          <span className="text-sm text-muted-foreground">→</span>
          <Link
            href={`/players/${beastestHolder.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {beastestHolder.gameName}#{beastestHolder.tagLine}
          </Link>
        </div>
      )}

      <div className="mb-8">
        <RecentMatchFeed
          items={recentMatches}
          title="Recent games"
          emptyMessage="No games yet. Sync players to fetch recent ranked matches."
          maxItems={6}
        />
      </div>

      {entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No tracked players yet. Add your squad under{" "}
              <span className="font-semibold text-foreground">Players</span> to
              start building the leaderboard.
            </p>
          </CardContent>
        </Card>
      ) : (
        <LeaderboardTable entries={entries} />
      )}
    </div>
  );
}
