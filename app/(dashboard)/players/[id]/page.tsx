import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerDetail, estimatedLpForMatch } from "@/lib/leaderboard";
import { getRecentRankEventsForPlayer } from "@/lib/rank-events";
import { getPlayerBadges, getRoughPatchSummary, BADGE_TOOLTIPS } from "@/lib/player-badges";
import { getBeastestHolder } from "@/lib/beastest";
import type { ChampionTrustLabel } from "@/lib/champion-trust";
import { SyncButton } from "./sync-button";
import { LpHistoryChart } from "@/components/lp-history-chart";
import { RecentRankEvents } from "@/components/recent-rank-events";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { tierColor } from "@/lib/tier-colors";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

function ChampionTrustBadge({ label }: { label: ChampionTrustLabel }) {
  const styles: Record<ChampionTrustLabel, string> = {
    TRUSTED: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    COINFLIP: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
    DO_NOT_ALLOW: "bg-destructive/20 text-destructive border-destructive/30",
    FAKE_COMFORT_PICK: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30",
    INSUFFICIENT_DATA: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium uppercase tracking-wide", styles[label])}
    >
      {label.replace(/_/g, " ")}
    </Badge>
  );
}

export const dynamic = "force-dynamic";

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [player, milestones, beastestHolder] = await Promise.all([
    getPlayerDetail(id),
    getRecentRankEventsForPlayer(id, 15),
    getBeastestHolder(),
  ]);
  if (!player) notFound();

  const rank = player.currentRank;
  const badges = getPlayerBadges(player.funStats, player.id, {
    beastestHolderId: beastestHolder?.id ?? null,
  });
  const roughPatch = getRoughPatchSummary(player.funStats);

  const last10 = player.recentMatches.slice(0, 10);
  const last20 = player.recentMatches.slice(0, 20);
  const last10Wins = last10.filter((m) => m.win).length;
  const last20Wins = last20.filter((m) => m.win).length;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground" asChild>
            <Link href="/players">← Players</Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight break-words sm:text-2xl">
            {player.gameName}
            <span className="font-normal text-muted-foreground">#{player.tagLine}</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-normal uppercase" title="Server/region where this account plays (e.g. EUW, NA).">
              {player.region}
            </Badge>
            {badges.length > 0 &&
              badges.map((b) => (
                <Badge
                  key={b}
                  variant={b === "THE BEASTEST" ? "default" : "outline"}
                  className={cn(
                    "font-normal",
                    b === "THE BEASTEST" && "bg-amber-500/90 text-black hover:bg-amber-500"
                  )}
                  title={BADGE_TOOLTIPS[b] ?? ""}
                >
                  {b}
                </Badge>
              ))}
          </div>
        </div>
        <SyncButton playerId={player.id} />
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold" title="Latest ranked tier, division, LP, and win/loss for this queue. Updated when you sync.">Current rank</h2>
          </CardHeader>
          <CardContent>
            {rank ? (
              <div className="flex flex-wrap gap-6">
                <div>
                  <span className={cn("text-xl font-bold", tierColor(rank.tier))}>
                    {rank.tier} {rank.rank}
                  </span>
                  <span className="ml-2 text-muted-foreground" title="League Points: progress within the current division (0–100).">{rank.leaguePoints} LP</span>
                </div>
                <div className="text-muted-foreground">
                  {rank.wins}W / {rank.losses}L
                  {rank.winrate != null && (
                    <span className="ml-2">({rank.winrate.toFixed(1)}% WR)</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Snapshot: {formatDateTime(rank.snapshotAt)}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                No rank data. Click &quot;Sync now&quot; to fetch from Riot.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Recent performance</h2>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              <div>
                <dt className="text-xs uppercase tracking-wide" title="Net League Points gained or lost over the last 7 days.">LP last 7 days</dt>
                <dd className="text-base font-medium text-foreground">
                  {player.funStats.lpGained7d >= 0 ? "+" : ""}
                  {player.funStats.lpGained7d} LP
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide" title="Net League Points gained or lost over the last 30 days.">LP last 30 days</dt>
                <dd className="text-base font-medium text-foreground">
                  {player.funStats.lpGained30d >= 0 ? "+" : ""}
                  {player.funStats.lpGained30d} LP
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Last 10 games</dt>
                <dd className="text-base font-medium text-foreground">
                  {last10.length >= 10
                    ? `${last10Wins}W–${10 - last10Wins}L (${player.funStats.winrateLast10?.toFixed(1) ?? "—"}%)`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Last 20 games</dt>
                <dd className="text-base font-medium text-foreground">
                  {last20.length >= 20
                    ? `${last20Wins}W–${20 - last20Wins}L (${player.funStats.winrateLast20?.toFixed(1) ?? "—"}%)`
                    : last20.length > 0
                      ? `${last20Wins}W–${last20.length - last20Wins}L (${player.funStats.winrateLast20?.toFixed(1) ?? "—"}%)`
                      : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide" title="Current number of consecutive wins.">Win streak</dt>
                <dd className="text-base font-medium text-foreground">
                  {player.funStats.currentWinStreak > 0
                    ? `W${player.funStats.currentWinStreak}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide" title="Current number of consecutive losses.">Loss streak</dt>
                <dd className="text-base font-medium text-foreground">
                  {player.funStats.currentLossStreak > 0
                    ? `L${player.funStats.currentLossStreak}`
                    : "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <RecentRankEvents
          events={milestones}
          showPlayerName={false}
          title="Recent Milestones"
          emptyMessage="No milestones yet. Sync to detect placements, promos, and new peaks."
        />
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Champions & KDA</h2>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              <div>
                <dt className="text-xs uppercase tracking-wide">Most played</dt>
                <dd className="text-base font-medium text-foreground">
                  {player.funStats.mostPlayedChampion ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Avg KDA (recent)</dt>
                <dd className="text-base font-medium text-foreground">
                  {player.funStats.averageKda != null
                    ? player.funStats.averageKda.toFixed(2)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Best by WR</dt>
                <dd className="text-base font-medium text-foreground">
                  {player.funStats.bestChampionByWinrate
                    ? `${player.funStats.bestChampionByWinrate.championName} (${player.funStats.bestChampionByWinrate.winrate.toFixed(1)}% · ${player.funStats.bestChampionByWinrate.games} games)`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Worst by WR</dt>
                <dd className="text-base font-medium text-foreground">
                  {player.funStats.worstChampionByWinrate
                    ? `${player.funStats.worstChampionByWinrate.championName} (${player.funStats.worstChampionByWinrate.winrate.toFixed(1)}% · ${player.funStats.worstChampionByWinrate.games} games)`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">Games last 7 days</dt>
                <dd className="text-base font-medium text-foreground">
                  {player.funStats.totalGamesLast7d}
                </dd>
              </div>
            </dl>
            {player.championTrust.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Champion trust
                </h3>
                <ul className="space-y-1.5 text-sm">
                  {player.championTrust.map((c) => (
                    <li
                      key={c.championName}
                      className="flex flex-wrap items-baseline gap-2"
                    >
                      <span className="font-medium text-foreground">{c.championName}</span>
                      <ChampionTrustBadge label={c.trustLabel} />
                      <span className="text-muted-foreground">{c.trustReason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {roughPatch && (
          <Card
            className={cn(
              "border-amber-500/30",
              roughPatch.severity === "high" && "border-destructive/40 bg-destructive/5",
              roughPatch.severity === "medium" && "bg-amber-500/5"
            )}
          >
            <CardHeader>
              <h2 className="text-lg font-semibold text-amber-600 dark:text-amber-500">
                Rough patch
              </h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{roughPatch.summary}</p>
              <Badge variant="secondary" className="mt-2 font-normal">
                Data-driven, not salt
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="mb-8">
        <CardHeader>
          <h2 className="text-lg font-semibold">Recent matches</h2>
        </CardHeader>
        <CardContent>
          {player.recentMatches.length === 0 ? (
            <p className="text-muted-foreground">
              No matches stored. Sync to fetch recent ranked games.
            </p>
          ) : (
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2 pr-2 sm:pr-4">Champion</th>
                    <th className="pb-2 pr-2 sm:pr-4">K/D/A</th>
                    <th className="pb-2 pr-2 sm:pr-4">Result</th>
                    <th className="pb-2 pr-2 sm:pr-4" title="LP change: from snapshots (sync before/after match) when available, otherwise estimated.">LP</th>
                    <th className="pb-2 pr-2 sm:pr-4">CS</th>
                    <th className="pb-2 pr-2 sm:pr-4">Gold</th>
                    <th className="pb-2 pr-2 sm:pr-4">Damage</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {player.recentMatches.map((m) => {
                    const lp = m.lpChange ?? estimatedLpForMatch(m.win);
                    const isCalculated = m.lpChange !== null;
                    return (
                    <tr
                      key={m.id}
                      className="border-b border-border text-muted-foreground last:border-b-0"
                    >
                      <td className="py-2 pr-2 font-medium text-foreground sm:pr-4">
                        {m.championName ?? "—"}
                      </td>
                      <td className="py-2 pr-2 sm:pr-4">
                        {m.kills}/{m.deaths}/{m.assists}
                      </td>
                      <td className="py-2 pr-2 sm:pr-4">
                        <span
                          className={
                            m.win ? "text-emerald-500" : "text-destructive"
                          }
                        >
                          {m.win ? "Win" : "Loss"}
                        </span>
                      </td>
                      <td className="py-2 pr-2 sm:pr-4" title={isCalculated ? "From rank snapshots (sync before and after this match)." : "Estimated (no snapshots bracketing this match; typical +24 win, -18 loss)."}>
                        <span className={lp >= 0 ? "text-emerald-500 font-medium" : "text-destructive font-medium"}>
                          {lp >= 0 ? "+" : ""}{lp}
                        </span>
                      </td>
                      <td className="py-2 pr-2 sm:pr-4">{m.cs}</td>
                      <td className="py-2 pr-2 sm:pr-4">{m.gold.toLocaleString()}</td>
                      <td className="py-2 pr-2 sm:pr-4">
                        {m.damageDealt.toLocaleString()}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        <Link
                          href={`/matches/${m.matchDbId}`}
                          className="text-primary hover:underline"
                        >
                          {formatDate(m.gameStartAt)}
                        </Link>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {player.recentSnapshots.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">LP history</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <LpHistoryChart
              snapshots={player.recentSnapshots.filter(
                (s) => s.queueType === "RANKED_SOLO_5x5"
              )}
            />
            {player.recentSnapshots.filter((s) => s.queueType === "RANKED_SOLO_5x5")
              .length > 0 && (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {player.recentSnapshots
                  .filter((s) => s.queueType === "RANKED_SOLO_5x5")
                  .slice(0, 10)
                  .map((s, i) => (
                    <li key={i}>
                      {s.tier} {s.rank} {s.leaguePoints} LP —{" "}
                      {formatDateTime(s.createdAt)}
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
