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
    <div className="relative p-4 sm:p-6 md:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-40 max-w-5xl bg-[radial-gradient(circle_at_top,_rgba(94,234,212,0.2),_transparent_60%)] blur-2xl" />

      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Tracked players
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add by Riot ID (gameName#tagLine) and region.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {players.length > 0 && <SyncAllButton />}
          <AddPlayerForm />
        </div>
      </div>

      {players.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div>
              <p className="text-sm text-muted-foreground">
                No players added yet.
              </p>
              <p className="mt-2 text-sm text-muted-foreground/80">
                Use the form above to add a player by Riot ID and region (e.g. na1, euw1).
              </p>
            </div>
            <Badge variant="secondary" className="font-normal">
              Private to your group
            </Badge>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60">
          <CardContent className="space-y-4 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-1">
                  {players.length} tracked {players.length === 1 ? "player" : "players"}
                </span>
                <Badge variant="secondary" className="font-normal">
                  Private lobby
                </Badge>
              </div>
            </div>

            <ul className="space-y-2">
              {players.map((p) => {
                const snap = p.rankSnapshots[0];
                return (
                  <li key={p.id}>
                    <Card className="border border-border/60 bg-background/60 transition-colors hover:bg-muted/40">
                      <CardContent className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <Link
                            href={`/players/${p.id}`}
                            className="truncate font-medium text-foreground hover:text-primary"
                          >
                            {p.gameName}#{p.tagLine}
                          </Link>
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-xs font-normal uppercase"
                            title="Server/region where this account plays (e.g. EUW, NA)."
                          >
                            {p.region}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                          {snap ? (
                            <span
                              className="text-sm text-muted-foreground"
                              title="Current tier, division, and League Points (LP). Sync to update."
                            >
                              {snap.tier} {snap.rank} — {snap.leaguePoints} LP
                            </span>
                          ) : (
                            <span
                              className="text-sm text-muted-foreground/80"
                              title="No ranked data yet. Use Sync on this player or Sync all to fetch from Riot."
                            >
                              No rank (sync to fetch)
                            </span>
                          )}
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto shrink-0 p-0"
                            asChild
                          >
                            <Link href={`/players/${p.id}`}>View →</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
