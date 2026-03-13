import { getLeaderboard, getLeaderboardRegions } from "@/lib/leaderboard";
import { LeaderboardTable } from "@/components/leaderboard-table";
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
  const [entries, regions] = await Promise.all([
    getLeaderboard(filters),
    getLeaderboardRegions(),
  ]);

  return (
    <div className="relative p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Friends leaderboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live ranked snapshot from your tracked players.
          </p>
        </div>
        <LeaderboardFilters regions={regions} />
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
