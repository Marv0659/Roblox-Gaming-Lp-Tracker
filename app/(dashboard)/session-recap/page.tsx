import Link from "next/link";
import {
  getSessionRecap,
  type SessionWindowPreset,
  type SessionRecapData,
} from "@/lib/session-recap";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function formatSessionWindow(preset: SessionWindowPreset): string {
  if (preset === "today") return "Today (since midnight)";
  return "Last 24 hours";
}

function formatTimeRange(start: Date, end: Date): string {
  const sameDay =
    start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} ${start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  }
  return `${start.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
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

function SessionRecapContent({ recap }: { recap: SessionRecapData }) {
  const hasActivity = recap.playerLp.some((p) => p.gamesPlayed > 0);

  return (
    <>
      {!hasActivity ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No ranked activity in this window. Sync and play to see a session
              recap.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recap.biggestWinner && recap.biggestWinner.netLp != null && recap.biggestWinner.netLp > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Biggest winner
                  </h2>
                </CardHeader>
                <CardContent>
                  <PlayerLink
                    playerId={recap.biggestWinner.playerId}
                    gameName={recap.biggestWinner.gameName}
                    tagLine={recap.biggestWinner.tagLine}
                  />
                  <p className="mt-1 text-lg font-semibold text-emerald-500">
                    +{recap.biggestWinner.netLp} LP
                    {recap.biggestWinner.gamesPlayed > 0 && (
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        ({recap.biggestWinner.gamesPlayed} games)
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            )}

            {recap.biggestLoser && recap.biggestLoser.netLp != null && recap.biggestLoser.netLp < 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Biggest loser
                  </h2>
                </CardHeader>
                <CardContent>
                  <PlayerLink
                    playerId={recap.biggestLoser.playerId}
                    gameName={recap.biggestLoser.gameName}
                    tagLine={recap.biggestLoser.tagLine}
                  />
                  <p className="mt-1 text-lg font-semibold text-destructive">
                    {recap.biggestLoser.netLp} LP
                    {recap.biggestLoser.gamesPlayed > 0 && (
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        ({recap.biggestLoser.gamesPlayed} games)
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            )}

            {recap.bestMatch && (
              <Card>
                <CardHeader className="pb-2">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Best match
                  </h2>
                </CardHeader>
                <CardContent>
                  <PlayerLink
                    playerId={recap.bestMatch.playerId}
                    gameName={recap.bestMatch.gameName}
                    tagLine={recap.bestMatch.tagLine}
                  />
                  <p className="mt-1 text-sm text-foreground">
                    {recap.bestMatch.championName ?? "—"} · {recap.bestMatch.reason}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {recap.bestMatch.gameStartAt.toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </CardContent>
              </Card>
            )}

            {recap.worstCollapse && (
              <Card>
                <CardHeader className="pb-2">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Worst collapse
                  </h2>
                </CardHeader>
                <CardContent>
                  <PlayerLink
                    playerId={recap.worstCollapse.playerId}
                    gameName={recap.worstCollapse.gameName}
                    tagLine={recap.worstCollapse.tagLine}
                  />
                  <p className="mt-1 text-sm text-foreground">
                    {recap.worstCollapse.championName ?? "—"} · {recap.worstCollapse.reason}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {recap.worstCollapse.gameStartAt.toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </CardContent>
              </Card>
            )}

            {recap.sessionMvp && (
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardHeader className="pb-2">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Session MVP
                  </h2>
                </CardHeader>
                <CardContent>
                  <PlayerLink
                    playerId={recap.sessionMvp.playerId}
                    gameName={recap.sessionMvp.gameName}
                    tagLine={recap.sessionMvp.tagLine}
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    {recap.sessionMvp.reason}
                  </p>
                </CardContent>
              </Card>
            )}

            {recap.sessionFraud && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Session fraud
                  </h2>
                </CardHeader>
                <CardContent>
                  <PlayerLink
                    playerId={recap.sessionFraud.playerId}
                    gameName={recap.sessionFraud.gameName}
                    tagLine={recap.sessionFraud.tagLine}
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    {recap.sessionFraud.reason}
                  </p>
                  <Badge variant="secondary" className="mt-2 font-normal text-xs">
                    Data-driven, not salt
                  </Badge>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                LP by player
              </h2>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recap.playerLp
                  .filter((p) => p.gamesPlayed > 0)
                  .sort((a, b) => (b.netLp ?? -Infinity) - (a.netLp ?? -Infinity))
                  .map((p) => (
                    <li
                      key={p.playerId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                    >
                      <PlayerLink
                        playerId={p.playerId}
                        gameName={p.gameName}
                        tagLine={p.tagLine}
                      />
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="tabular-nums">
                          {p.netLp != null
                            ? `${p.netLp >= 0 ? "+" : ""}${p.netLp} LP`
                            : "— LP"}
                        </span>
                        <span>
                          {p.gamesPlayed} games
                          {p.winrate != null && ` · ${p.winrate.toFixed(0)}% WR`}
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export default async function SessionRecapPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const params = await searchParams;
  const preset: SessionWindowPreset =
    params.window === "today" ? "today" : "last24h";
  const recap = await getSessionRecap(preset);
  const windowLabel = formatSessionWindow(preset);
  const timeRange = formatTimeRange(recap.window.start, recap.window.end);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Session recap
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {windowLabel} · {timeRange} · Solo queue, from synced data only
        </p>
        <div className="mt-2 flex gap-2">
          <Link
            href="/session-recap?window=last24h"
            className={`rounded-md px-2 py-1 text-sm font-medium transition-colors ${preset === "last24h" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            Last 24h
          </Link>
          <Link
            href="/session-recap?window=today"
            className={`rounded-md px-2 py-1 text-sm font-medium transition-colors ${preset === "today" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            Today
          </Link>
        </div>
      </div>

      <SessionRecapContent recap={recap} />
    </div>
  );
}
