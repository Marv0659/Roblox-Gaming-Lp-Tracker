import Link from "next/link";
import { getDuoStats } from "@/lib/duo-stats";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const MIN_GAMES_FOR_BEST = 2;

export default async function DuosPage() {
  const duos = await getDuoStats();
  const bestDuos = duos.filter((d) => d.gamesTogether >= MIN_GAMES_FOR_BEST);

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
                  {bestDuos.slice(0, 10).map((duo) => (
                    <li
                      key={`${duo.playerA.id}-${duo.playerB.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/players/${duo.playerA.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {duo.playerA.gameName}#{duo.playerA.tagLine}
                        </Link>
                        <span className="text-muted-foreground">&</span>
                        <Link
                          href={`/players/${duo.playerB.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {duo.playerB.gameName}#{duo.playerB.tagLine}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-normal">
                          {duo.gamesTogether} games
                        </Badge>
                        <span
                          className={
                            duo.winrate >= 60
                              ? "font-semibold text-emerald-500"
                              : duo.winrate >= 50
                                ? "font-medium text-foreground"
                                : "text-muted-foreground"
                          }
                        >
                          {duo.winrate.toFixed(1)}% WR
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {duo.winsTogether}W / {duo.lossesTogether}L
                        </span>
                      </div>
                    </li>
                  ))}
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
