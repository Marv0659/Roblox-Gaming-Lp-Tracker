import Link from "next/link";
import { getDuoStats, type DuoPair } from "@/lib/duo-stats";
import { cn } from "@/lib/utils";
import { Eyebrow, Panel, SectionTitle, WinLossBar } from "@/components/lol";

export const dynamic = "force-dynamic";

const MIN_GAMES_FOR_BEST = 5;

function wrTone(winrate: number): string {
  if (winrate >= 55) return "text-win";
  if (winrate < 45) return "text-loss";
  return "text-foreground";
}

function DuoNames({ duo, tags = false }: { duo: DuoPair; tags?: boolean }) {
  return (
    <span className="min-w-0">
      <Link href={`/players/${duo.playerA.id}`} className="font-semibold hover:underline">
        {duo.playerA.gameName}
        {tags && <span className="font-medium text-faint">#{duo.playerA.tagLine}</span>}
      </Link>
      <span className="mx-1.5 text-faint">+</span>
      <Link href={`/players/${duo.playerB.id}`} className="font-semibold hover:underline">
        {duo.playerB.gameName}
        {tags && <span className="font-medium text-faint">#{duo.playerB.tagLine}</span>}
      </Link>
    </span>
  );
}

export default async function DuosPage() {
  const duos = await getDuoStats();
  const bestDuos = duos
    .filter((d) => d.gamesTogether >= MIN_GAMES_FOR_BEST)
    .sort((a, b) => {
      if (b.winrate !== a.winrate) return b.winrate - a.winrate;
      return b.gamesTogether - a.gamesTogether;
    });

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-wide md:text-[44px]">
          Duos
        </h1>
        <p className="text-sm text-muted-foreground">
          How tracked players do when they queue together (same match, same team). Solo / duo games only.
        </p>
      </header>

      {duos.length === 0 ? (
        <Panel className="border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          No duo games yet. Sync matches for tracked players who play together to see stats here.
        </Panel>
      ) : (
        <>
          <section aria-label="Best duos" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <SectionTitle>Best duos</SectionTitle>
              <span className="text-xs text-faint">At least {MIN_GAMES_FOR_BEST} games together</span>
            </div>
            {bestDuos.length === 0 ? (
              <Panel className="border-dashed px-5 py-6 text-sm text-muted-foreground">
                No pairs with {MIN_GAMES_FOR_BEST}+ games together yet.
              </Panel>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {bestDuos.slice(0, 6).map((duo, i) => (
                  <Panel key={`${duo.playerA.id}-${duo.playerB.id}`} className="flex flex-col gap-3 p-5">
                    <Eyebrow className={i === 0 ? "text-brand" : undefined}>
                      {i === 0 ? "Best duo" : `#${i + 1}`}
                    </Eyebrow>
                    <div className="text-[17px] leading-snug">
                      <DuoNames duo={duo} />
                    </div>
                    <div className={cn("font-display text-4xl font-bold leading-none tabular-nums", wrTone(duo.winrate))}>
                      {duo.winrate.toFixed(1)}%
                    </div>
                    <WinLossBar wins={duo.winsTogether} losses={duo.lossesTogether} />
                  </Panel>
                ))}
              </div>
            )}
          </section>

          <Panel aria-label="All duo pairings" className="overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <SectionTitle>All pairings</SectionTitle>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
                    <th scope="col" className="px-5 py-3 font-semibold">Duo</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Games</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">W / L</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Win rate</th>
                  </tr>
                </thead>
                <tbody>
                  {duos.map((duo) => (
                    <tr
                      key={`${duo.playerA.id}-${duo.playerB.id}`}
                      className="border-b border-[#1e2228] last:border-b-0 hover:bg-surface-2/60"
                    >
                      <td className="px-5 py-3">
                        <DuoNames duo={duo} tags />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{duo.gamesTogether}</td>
                      <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
                        <span className="text-win">{duo.winsTogether}W</span>{" "}
                        <span className="text-loss">{duo.lossesTogether}L</span>
                      </td>
                      <td className={cn("px-5 py-3 text-right font-display text-lg font-bold tabular-nums", wrTone(duo.winrate))}>
                        {duo.winrate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
