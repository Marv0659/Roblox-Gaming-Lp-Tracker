import Link from "next/link";
import { getTrackedPlayers } from "@/app/actions/players";
import { AddPlayerForm } from "./add-player-form";
import { SyncAllButton } from "./sync-all-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await getTrackedPlayers();

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tracked players</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add by Riot ID (gameName#tagLine) and region
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {players.length > 0 && <SyncAllButton />}
          <AddPlayerForm />
        </div>
      </div>

      {players.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No players added yet.</p>
            <p className="mt-2 text-sm text-muted-foreground/80">
              Use the form above to add a player by Riot ID and region (e.g. na1,
              euw1).
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {players.map((p) => {
            const snap = p.rankSnapshots[0];
            return (
              <li key={p.id}>
                <Card className="transition-colors hover:bg-muted/30">
                  <CardContent className="flex flex-row items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/players/${p.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {p.gameName}#{p.tagLine}
                      </Link>
                      <Badge variant="secondary" className="text-xs font-normal uppercase">
                        {p.region}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      {snap ? (
                        <span className="text-sm text-muted-foreground">
                          {snap.tier} {snap.rank} — {snap.leaguePoints} LP
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground/80">
                          No rank (sync to fetch)
                        </span>
                      )}
                      <Button variant="link" size="sm" className="h-auto p-0" asChild>
                        <Link href={`/players/${p.id}`}>View →</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
