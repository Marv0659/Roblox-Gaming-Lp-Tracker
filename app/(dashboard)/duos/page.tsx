import Link from "next/link";
import { getDuoStats } from "@/lib/duo-stats";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const MIN_GAMES_FOR_BEST = 2;

export default async function DuosPage() {
  const duos = await getDuoStats();
  const bestDuos = duos
    .filter((d) => d.gamesTogether >= MIN_GAMES_FOR_BEST)
    .sort((a, b) => {
      if (b.winrate !== a.winrate) return b.winrate - a.winrate;
      return b.gamesTogether - a.gamesTogether;
    });

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Duo stats</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How tracked players perform when playing together (same match, same
          team). From synced match data only.
        </p>
      </div>

      {duos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No duo games yet. Sync matches for tracked players who play
              together to see stats here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-8">
            <CardHeader>
              <h2 className="text-lg font-semibold">
                Best-performing duos
                <span className="ml-2 font-normal text-muted-foreground">
                  (min {MIN_GAMES_FOR_BEST} games together)
                </span>
              </h2>
            </CardHeader>
            <CardContent>
              {bestDuos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pairs with at least {MIN_GAMES_FOR_BEST} games yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {bestDuos.slice(0, 10).map((duo) => {
                    const isHighWr = duo.winrate >= 60;
                    const isMidWr = duo.winrate >= 50 && duo.winrate < 60;

                    return (
                      <li
                        key={`${duo.playerA.id}-${duo.playerB.id}`}
                        className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-all hover:shadow-md sm:flex-nowrap"
                      >
                        {/* Decorative glow for high WR */}
                        {isHighWr && (
                          <>
                            <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
                            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
                          </>
                        )}

                        <div className="flex flex-col gap-2 relative z-10 w-full sm:w-auto">
                          <Link
                            href={`/players/${duo.playerA.id}`}
                            className="group flex items-center gap-2"
                          >
                            <span className="font-semibold text-foreground transition-colors group-hover:text-primary">
                              {duo.playerA.gameName}
                            </span>
                          </Link>
                          <Link
                            href={`/players/${duo.playerB.id}`}
                            className="group flex items-center gap-2"
                          >
                            <span className="font-semibold text-foreground transition-colors group-hover:text-primary">
                              {duo.playerB.gameName}
                            </span>
                          </Link>
                        </div>

                        <div className="flex items-center gap-6 relative z-10 w-full sm:w-auto sm:justify-end">
                          <div className="flex flex-col items-start sm:items-end gap-1">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                              Record
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-normal border-border/60">
                                {duo.gamesTogether} matches
                              </Badge>
                              <span className="text-sm text-muted-foreground font-medium">
                                {duo.winsTogether}W - {duo.lossesTogether}L
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-0.5 min-w-[4rem]">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                              Winrate
                            </span>
                            <span
                              className={`text-2xl font-bold tracking-tighter ${
                                isHighWr
                                  ? "text-emerald-500"
                                  : isMidWr
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {duo.winrate.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {duos.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">All duo pairings</h2>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="pb-2 pr-4">Duo</th>
                        <th className="pb-2 pr-4">Games</th>
                        <th className="pb-2 pr-4">W / L</th>
                        <th className="pb-2">Winrate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duos.map((duo) => (
                        <tr
                          key={`${duo.playerA.id}-${duo.playerB.id}`}
                          className="border-b border-border text-muted-foreground last:border-b-0"
                        >
                          <td className="py-2 pr-4">
                            <Link
                              href={`/players/${duo.playerA.id}`}
                              className="text-foreground hover:text-primary"
                            >
                              {duo.playerA.gameName}#{duo.playerA.tagLine}
                            </Link>
                            <span className="mx-1 text-muted-foreground">
                              &
                            </span>
                            <Link
                              href={`/players/${duo.playerB.id}`}
                              className="text-foreground hover:text-primary"
                            >
                              {duo.playerB.gameName}#{duo.playerB.tagLine}
                            </Link>
                          </td>
                          <td className="py-2 pr-4">{duo.gamesTogether}</td>
                          <td className="py-2 pr-4">
                            {duo.winsTogether} / {duo.lossesTogether}
                          </td>
                          <td className="py-2">
                            {duo.winrate.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
