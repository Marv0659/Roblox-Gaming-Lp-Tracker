import { getLeaderboard, getLeaderboardRegions } from "@/lib/leaderboard";
import { getRecentRankEvents } from "@/lib/rank-events";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { RecentRankEvents } from "@/components/recent-rank-events";
import { LeaderboardFilters } from "./leaderboard-filters";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

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
  const [entries, regions, recentEvents] = await Promise.all([
    getLeaderboard(filters),
    getLeaderboardRegions(),
    getRecentRankEvents(20),
  ]);

  return (
    <div className="relative p-4 sm:p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Friends leaderboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live ranked snapshot from your tracked players.
          </p>
        </div>
        <LeaderboardFilters regions={regions} />
      </div>

      <div className="mb-8">
        <RecentRankEvents
          events={recentEvents}
          showPlayerName
          title="Recent Ranked Events"
          emptyMessage="No rank events yet. Sync players to detect placements, promos, and demotions."
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
