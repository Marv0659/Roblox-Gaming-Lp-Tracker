import Link from "next/link";
import { getWeeklyRecap } from "@/lib/recap";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function formatWindow(window: { start: Date; end: Date }): string {
  const start = window.start.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const end = window.end.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${start} – ${end}`;
}

function PlayerLink({
  playerId,
  gameName,
  tagLine,
  children,
}: {
  playerId: string;
  gameName: string;
  tagLine: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={`/players/${playerId}`}
      className="font-medium text-foreground hover:text-primary"
    >
      {children ?? `${gameName}#${tagLine}`}
    </Link>
  );
}

export default async function RecapPage() {
  const recap = await getWeeklyRecap();

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Weekly recap
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatWindow(recap.window)} · Solo queue, from synced data only
        </p>
      </div>

      {recap.playerStats.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No tracked players or no activity in this window. Add players and
              sync to see recaps.
            </p>
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recap.biggestLpGainer && (
            <Card className="order-1 lg:order-1">
              <CardHeader className="pb-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Biggest LP gainer
                </h2>
              </CardHeader>
              <CardContent>
                <PlayerLink
                  playerId={recap.biggestLpGainer.playerId}
                  gameName={recap.biggestLpGainer.gameName}
                  tagLine={recap.biggestLpGainer.tagLine}
                />
                <p className="mt-1 text-lg font-semibold text-emerald-500">
                  {recap.biggestLpGainer.label}
                </p>
              </CardContent>
            </Card>
          )}

          {recap.biggestLpLoser && (
            <Card className="order-2 lg:order-2">
              <CardHeader className="pb-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Biggest LP loser
                </h2>
              </CardHeader>
              <CardContent>
                <PlayerLink
                  playerId={recap.biggestLpLoser.playerId}
                  gameName={recap.biggestLpLoser.gameName}
                  tagLine={recap.biggestLpLoser.tagLine}
                />
                <p className="mt-1 text-lg font-semibold text-destructive">
                  {recap.biggestLpLoser.label}
                </p>
              </CardContent>
            </Card>
          )}

          {recap.bestWinrate && (
            <Card className="order-3 lg:order-4">
              <CardHeader className="pb-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Best winrate this week
                </h2>
              </CardHeader>
              <CardContent>
                <PlayerLink
                  playerId={recap.bestWinrate.playerId}
                  gameName={recap.bestWinrate.gameName}
                  tagLine={recap.bestWinrate.tagLine}
                />
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {recap.bestWinrate.label}
                </p>
              </CardContent>
            </Card>
          )}

          {recap.worstWinrate && (
            <Card className="order-4 lg:order-5">
              <CardHeader className="pb-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Worst winrate this week
                </h2>
              </CardHeader>
              <CardContent>
                <PlayerLink
                  playerId={recap.worstWinrate.playerId}
                  gameName={recap.worstWinrate.gameName}
                  tagLine={recap.worstWinrate.tagLine}
                />
                <p className="mt-1 text-lg font-semibold text-muted-foreground">
                  {recap.worstWinrate.label}
                </p>
              </CardContent>
            </Card>
          )}

          {recap.mostGames && (
            <Card className="order-5 lg:order-3">
              <CardHeader className="pb-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Most games played
                </h2>
              </CardHeader>
              <CardContent>
                <PlayerLink
                  playerId={recap.mostGames.playerId}
                  gameName={recap.mostGames.gameName}
                  tagLine={recap.mostGames.tagLine}
                />
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {recap.mostGames.label}
                </p>
              </CardContent>
            </Card>
          )}

          {recap.longestWinStreak && (
            <Card className="order-6 lg:order-6">
              <CardHeader className="pb-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Longest win streak
                </h2>
              </CardHeader>
              <CardContent>
                <PlayerLink
                  playerId={recap.longestWinStreak.playerId}
                  gameName={recap.longestWinStreak.gameName}
                  tagLine={recap.longestWinStreak.tagLine}
                />
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {recap.longestWinStreak.label}
                </p>
              </CardContent>
            </Card>
          )}

          {recap.roughWeek && (
            <Card className="order-7 sm:col-span-2 lg:col-span-3 border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Rough week candidate
                </h2>
              </CardHeader>
              <CardContent>
                <PlayerLink
                  playerId={recap.roughWeek.playerId}
                  gameName={recap.roughWeek.gameName}
                  tagLine={recap.roughWeek.tagLine}
                />
                <p className="mt-1 text-muted-foreground">
                  {recap.roughWeek.reason}
                  {recap.roughWeek.lpChange != null && recap.roughWeek.lpChange < 0 && (
                    <> · {recap.roughWeek.lpChange} LP</>
                  )}
                </p>
                <Badge variant="secondary" className="mt-2 font-normal">
                  Played a lot, didn’t go so well
                </Badge>
              </CardContent>
            </Card>
          )}

          {(recap.stinkerOfTheWeek.worstKda || recap.stinkerOfTheWeek.mostDeaths) && (
            <Card className="order-8 sm:col-span-2 lg:col-span-3 border-rose-500/30 bg-rose-500/5">
              <CardHeader className="pb-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  💩 Stinker of the Week 💩
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {recap.stinkerOfTheWeek.worstKda && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Worst KDA in a game</p>
                    <p className="text-sm">
                      <PlayerLink
                        playerId={recap.stinkerOfTheWeek.worstKda.playerId}
                        gameName={recap.stinkerOfTheWeek.worstKda.gameName}
                        tagLine={recap.stinkerOfTheWeek.worstKda.tagLine}
                      />
                      {recap.stinkerOfTheWeek.worstKda.championName && (
                        <span className="text-muted-foreground"> on {recap.stinkerOfTheWeek.worstKda.championName}</span>
                      )}
                      {" — "}
                      <Link
                        href={`/matches/${recap.stinkerOfTheWeek.worstKda.matchDbId}`}
                        className="font-semibold text-destructive hover:underline"
                      >
                        {recap.stinkerOfTheWeek.worstKda.kills}/
                        {recap.stinkerOfTheWeek.worstKda.deaths}/
                        {recap.stinkerOfTheWeek.worstKda.assists}
                        {" "}
                        ({recap.stinkerOfTheWeek.worstKda.kda.toFixed(2)} KDA)
                      </Link>
                    </p>
                  </div>
                )}
                {recap.stinkerOfTheWeek.mostDeaths && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Most deaths in a game</p>
                    <p className="text-sm">
                      <PlayerLink
                        playerId={recap.stinkerOfTheWeek.mostDeaths.playerId}
                        gameName={recap.stinkerOfTheWeek.mostDeaths.gameName}
                        tagLine={recap.stinkerOfTheWeek.mostDeaths.tagLine}
                      />
                      {recap.stinkerOfTheWeek.mostDeaths.championName && (
                        <span className="text-muted-foreground"> on {recap.stinkerOfTheWeek.mostDeaths.championName}</span>
                      )}
                      {" — "}
                      <Link
                        href={`/matches/${recap.stinkerOfTheWeek.mostDeaths.matchDbId}`}
                        className="font-semibold text-destructive hover:underline"
                      >
                        {recap.stinkerOfTheWeek.mostDeaths.kills}/
                        {recap.stinkerOfTheWeek.mostDeaths.deaths}/
                        {recap.stinkerOfTheWeek.mostDeaths.assists}
                        {" "}
                        ({recap.stinkerOfTheWeek.mostDeaths.deaths} deaths 💀)
                      </Link>
                    </p>
                  </div>
                )}
                <Badge variant="secondary" className="font-normal">
                  Yeah mid fed guys...
                </Badge>
              </CardContent>
            </Card>
          )}
          {recap.queueRecommendations && recap.queueRecommendations.length > 0 && (
            <Card className="order-9 sm:col-span-2 lg:col-span-3">
              <CardHeader className="pb-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Should they queue? (all tracked)
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Light-weight, rule-based recommendations for all tracked players.
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="pb-2 pr-4">Player</th>
                        <th className="pb-2 pr-4">Label</th>
                        <th className="pb-2 pr-4">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recap.queueRecommendations
                        .slice()
                        .sort((a, b) => b.score - a.score)
                        .map((r) => (
                          <tr
                            key={r.playerId}
                            className="border-b border-border text-muted-foreground last:border-b-0"
                          >
                            <td className="py-2 pr-4">
                              <PlayerLink
                                playerId={r.playerId}
                                gameName={r.gameName}
                                tagLine={r.tagLine}
                              />
                            </td>
                            <td className="py-2 pr-4">
                              <span className="font-medium text-foreground">
                                {r.label === "ONLY_IF_NOT_LOCKING_THAT_CHAMP" && r.badChampionName
                                  ? `ONLY IF NOT LOCKING ${r.badChampionName}`
                                  : r.label.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="py-2 pr-4">
                              {Math.round(r.score)} / 100
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
