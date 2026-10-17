import Link from "next/link";
import { getTrackedPlayers } from "@/app/actions/players";
import { tierColor } from "@/lib/tier-colors";
import { cn, formatShortDate, formatTime } from "@/lib/utils";
import { LpBar, Panel, prettyTier, SectionTitle, TierEmblem, WinLossBar } from "@/components/lol";
import { AddPlayerForm } from "./add-player-form";

export const dynamic = "force-dynamic";

function syncedLabel(date: Date | null): string {
  if (!date) return "Never synced";
  const day = formatShortDate(date) === formatShortDate(new Date()) ? "today" : formatShortDate(date);
  return `Synced ${day}, ${formatTime(date)}`;
}

export default async function PlayersPage() {
  const players = await getTrackedPlayers();
  const regions = [...new Set(players.map((p) => p.region.toUpperCase()))];

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-wide md:text-[44px]">
          Players
        </h1>
        <p className="text-sm text-muted-foreground">
          {players.length} tracked {players.length === 1 ? "player" : "players"}
          {regions.length > 0 && ` · ${regions.join(", ")}`} · private to your group
        </p>
      </header>

      <Panel aria-label="Add a player" className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <SectionTitle>Add a player</SectionTitle>
          <p className="text-sm text-muted-foreground">
            Riot ID and region. Pasting <span className="text-foreground">Name#Tag</span> into either field fills both.
          </p>
        </div>
        <AddPlayerForm />
      </Panel>

      {players.length === 0 ? (
        <Panel className="border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          No players yet. Add someone above by Riot ID and region (for example euw1 or na1).
        </Panel>
      ) : (
        <Panel aria-label="Tracked players" className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(190px,1.2fr)_minmax(150px,1fr)_150px] gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint lg:grid">
            <div>Player</div>
            <div>Solo / Duo</div>
            <div>Season</div>
            <div>Last sync</div>
          </div>
          <ul>
            {players.map((p) => {
              const snap = p.rankSnapshots[0];
              return (
                <li key={p.id} className="border-b border-[#1e2228] last:border-b-0">
                  <Link
                    href={`/players/${p.id}`}
                    className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-3.5 py-3 transition-colors hover:bg-surface-2/60 lg:grid-cols-[minmax(0,1.4fr)_minmax(190px,1.2fr)_minmax(150px,1fr)_150px] lg:gap-4 lg:px-5"
                  >
                    {/* phone: emblem + two-line summary */}
                    <TierEmblem tier={snap?.tier} size={26} className="lg:hidden" />
                    <div className="flex min-w-0 flex-col gap-1 lg:hidden">
                      <div className="flex justify-between gap-2">
                        <span className="truncate text-[15px] font-semibold">
                          {p.gameName} <span className="font-medium text-faint">#{p.tagLine}</span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 font-display text-[17px] font-bold",
                            snap ? tierColor(snap.tier) : "text-faint"
                          )}
                        >
                          {snap ? `${prettyTier(snap.tier, snap.rank)} · ${snap.leaguePoints}` : "Unranked"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 text-xs text-faint">
                        <span className="uppercase">{p.region}</span>
                        <span>{syncedLabel(p.lastSyncedAt)}</span>
                      </div>
                    </div>

                    {/* desktop columns */}
                    <div className="hidden min-w-0 items-center gap-2 lg:flex">
                      <span className="truncate text-[15px] font-semibold">
                        {p.gameName} <span className="font-medium text-faint">#{p.tagLine}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] uppercase text-[#cdd2d9]">
                        {p.region}
                      </span>
                    </div>
                    <div className="hidden min-w-0 items-center gap-3 lg:flex">
                      <TierEmblem tier={snap?.tier} size={28} />
                      {snap ? (
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <div className="flex justify-between gap-2 text-sm">
                            <span className={cn("font-semibold whitespace-nowrap", tierColor(snap.tier))}>
                              {prettyTier(snap.tier, snap.rank)}
                            </span>
                            <span className="tabular-nums whitespace-nowrap text-muted-foreground">
                              {snap.leaguePoints} LP
                            </span>
                          </div>
                          <LpBar tier={snap.tier} lp={snap.leaguePoints} />
                        </div>
                      ) : (
                        <span className="text-sm text-faint">Unranked · sync to fetch</span>
                      )}
                    </div>
                    <div className="hidden lg:block">
                      {snap ? <WinLossBar wins={snap.wins} losses={snap.losses} /> : <span className="text-sm text-faint">—</span>}
                    </div>
                    <div className="hidden text-[13px] text-muted-foreground lg:block">{syncedLabel(p.lastSyncedAt)}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <p className="text-xs text-faint">
        Ranks come from the latest solo queue snapshot. Use Sync all in the sidebar to refresh everyone.
      </p>
    </div>
  );
}
