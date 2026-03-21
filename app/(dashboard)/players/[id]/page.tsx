import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerDetail } from "@/lib/leaderboard";
import { getRecentRankEventsForPlayer } from "@/lib/rank-events";
import { getPlayerBadges, getRoughPatchSummary, BADGE_TOOLTIPS } from "@/lib/player-badges";
import { getBeastestHolder } from "@/lib/beastest";
import type { ChampionTrustLabel } from "@/lib/champion-trust";
import { getQueueRecommendationForPlayer } from "@/lib/queue-recommendation";
import { SyncButton } from "./sync-button";
import { ViewSwitcher } from "./view-switcher";
import { RecentMatchesTabs } from "./recent-matches-tabs";
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
    POCKET_PICK: "bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30",
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
  const queueRecommendation = getQueueRecommendationForPlayer(player);

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
          <p className="mt-1">
            <Link
              href={`/ranked-wrapped?player=${encodeURIComponent(id)}`}
              className="text-sm font-medium text-violet-400 hover:text-violet-300 hover:underline"
            >
              Open Ranked Wrapped →
            </Link>
          </p>
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
        <div className="flex items-center gap-2 flex-wrap">
          <ViewSwitcher playerId={player.id} />
          <SyncButton playerId={player.id} />
        </div>
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
        <Card
          className={cn(
            "border-border/60",
            queueRecommendation.recommendationLabel === "YES" &&
              "border-emerald-500/40 bg-emerald-500/5",
            queueRecommendation.recommendationLabel === "ONLY_WITH_SUPERVISION" &&
              "border-amber-500/40 bg-amber-500/5",
            queueRecommendation.recommendationLabel === "ONLY_IF_NOT_LOCKING_THAT_CHAMP" &&
              "border-violet-500/40 bg-violet-500/5",
            queueRecommendation.recommendationLabel === "NO" &&
              "border-destructive/40 bg-destructive/5",
            queueRecommendation.recommendationLabel === "ABSOLUTELY_NOT" &&
              "border-destructive/70 bg-destructive/10"
          )}
        >
          <CardHeader>
            <h2 className="text-lg font-semibold">Should you queue?</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight">
                  {queueRecommendation.recommendationLabel === "ONLY_IF_NOT_LOCKING_THAT_CHAMP" &&
                  queueRecommendation.badChampionName
                    ? `ONLY IF NOT LOCKING ${queueRecommendation.badChampionName}`
                    : queueRecommendation.recommendationLabel.replace(/_/g, " ")}
                </span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {Math.round(queueRecommendation.recommendationScore)} / 100
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Confidence: {(queueRecommendation.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {queueRecommendation.shortReason}
            </p>
            {queueRecommendation.warningTags && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {queueRecommendation.warningTags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] uppercase">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {(queueRecommendation.championWarning || queueRecommendation.queueCurfewWarning) && (
              <div className="pt-2 text-xs text-muted-foreground space-y-1">
                {queueRecommendation.championWarning && (
                  <p>Champion warning: {queueRecommendation.championWarning}</p>
                )}
                {queueRecommendation.queueCurfewWarning && (
                  <p>Curfew hint: {queueRecommendation.queueCurfewWarning}</p>
                )}
              </div>
            )}
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
          <RecentMatchesTabs matches={player.recentMatches} />
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
