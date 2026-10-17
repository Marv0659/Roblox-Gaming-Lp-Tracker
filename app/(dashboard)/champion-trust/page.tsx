import Link from "next/link";
import { getGlobalChampionTrustLeaderboards } from "@/lib/champion-trust-leaderboard";
import type { GlobalChampionTrustRow } from "@/lib/champion-trust-leaderboard";
import type { ChampionTrustLabel } from "@/lib/champion-trust";
import { getChampionIdsByName } from "@/lib/champion-ids";
import { cn } from "@/lib/utils";
import { ChampionIcon, Eyebrow, Panel, SectionTitle } from "@/components/lol";

export const dynamic = "force-dynamic";

const TRUST: Record<ChampionTrustLabel, { label: string; className: string }> = {
  TRUSTED: { label: "Trusted", className: "bg-win-soft text-win" },
  POCKET_PICK: { label: "Pocket pick", className: "bg-[#b48cff]/18 text-[#c9aeff]" },
  COINFLIP: { label: "Coinflip", className: "bg-brand/15 text-brand" },
  FAKE_COMFORT_PICK: { label: "Fake comfort", className: "bg-loss-soft text-loss" },
  DO_NOT_ALLOW: { label: "Do not allow", className: "bg-loss-soft text-loss" },
  INSUFFICIENT_DATA: { label: "Too early", className: "bg-surface-2 text-muted-foreground" },
};

function wrTone(winrate: number): string {
  if (winrate >= 55) return "text-win";
  if (winrate < 45) return "text-loss";
  return "text-foreground";
}

function TrustRow({ row, championId }: { row: GlobalChampionTrustRow; championId?: number }) {
  const t = TRUST[row.trustLabel];
  return (
    <Link
      href={`/players/${row.playerId}`}
      title={row.shortReason}
      className="flex min-h-14 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2/60"
    >
      <ChampionIcon championId={championId} championName={row.championName} className="size-10" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm">
          <span className="font-semibold">{row.championName}</span>
          <span className="text-faint"> · {row.gameName}</span>
        </span>
        <span className="text-xs text-faint">
          {row.wins}W {row.losses}L · {row.avgKda.toFixed(2)} KDA
          {row.recentWinrate != null && ` · recent ${Math.round(row.recentWinrate)}%`}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={cn("font-display text-xl font-bold leading-none tabular-nums", wrTone(row.winrate))}>
          {Math.round(row.winrate)}%
        </span>
        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", t.className)}>
          {t.label}
        </span>
      </div>
    </Link>
  );
}

function CategoryPanel({
  title,
  eyebrow,
  eyebrowClass,
  description,
  rows,
  emptyMessage,
  championIds,
}: {
  title: string;
  eyebrow: string;
  eyebrowClass: string;
  description: string;
  rows: GlobalChampionTrustRow[];
  emptyMessage: string;
  championIds: Record<string, number>;
}) {
  return (
    <Panel aria-label={title} className="flex min-w-0 flex-col gap-3 p-5">
      <div className="flex flex-col gap-1">
        <Eyebrow className={eyebrowClass}>{eyebrow}</Eyebrow>
        <SectionTitle>{title}</SectionTitle>
        <p className="text-xs text-faint">{description}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {rows.map((row, i) => (
            <li key={`${row.playerId}-${row.championName}-${i}`}>
              <TrustRow row={row} championId={championIds[row.championName]} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default async function ChampionTrustPage() {
  const data = await getGlobalChampionTrustLeaderboards();
  const championIds = await getChampionIdsByName(
    [...data.fraudulentComfortPicks, ...data.coinflipPicks, ...data.mostTrustedPicks, ...data.hiddenPocketPicks].map(
      (r) => r.championName
    )
  );

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-wide md:text-[44px]">
          Champion trust
        </h1>
        <p className="text-sm text-muted-foreground">
          Which picks the squad can actually rely on. Stable picks get trusted, swingy ones land in coinflip.
        </p>
      </header>

      <Panel aria-label="How labels work" className="grid gap-4 p-5 text-sm sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Eyebrow className="text-win">Trusted</Eyebrow>
          <p className="text-muted-foreground">8+ games, at least 52% win rate, no big recent swing.</p>
        </div>
        <div className="flex flex-col gap-1">
          <Eyebrow className="text-brand">Coinflip</Eyebrow>
          <p className="text-muted-foreground">A real sample with a 48–52% win rate, or sharp recent swings.</p>
        </div>
        <div className="flex flex-col gap-1">
          <Eyebrow>Too early</Eyebrow>
          <p className="text-muted-foreground">Fewer than 5 games. Never used for high-volume champions.</p>
        </div>
      </Panel>

      <div className="grid items-start gap-3 lg:grid-cols-2 md:gap-4">
        <CategoryPanel
          eyebrow="Fraud watch"
          eyebrowClass="text-loss"
          title="Fake comfort picks"
          description="Played a lot, results don’t back it up."
          rows={data.fraudulentComfortPicks}
          emptyMessage="Nobody qualifies yet. Needs 5+ games on a top-3 champion under 45% win rate."
          championIds={championIds}
        />
        <CategoryPanel
          eyebrow="Reliable"
          eyebrowClass="text-win"
          title="Most trusted"
          description="Big sample, reliably good results."
          rows={data.mostTrustedPicks}
          emptyMessage="No trusted picks yet. Needs 8+ games with stable positive results."
          championIds={championIds}
        />
        <CategoryPanel
          eyebrow="Swingy"
          eyebrowClass="text-brand"
          title="Coinflips"
          description="Could go either way; inconsistent results."
          rows={data.coinflipPicks}
          emptyMessage="No coinflip picks yet."
          championIds={championIds}
        />
        <CategoryPanel
          eyebrow="Hidden gems"
          eyebrowClass="text-[#c9aeff]"
          title="Pocket picks"
          description="Low volume but surprisingly strong (3–8 games, 60%+ win rate)."
          rows={data.hiddenPocketPicks}
          emptyMessage="No pocket picks yet. Needs 3–8 games with 60%+ win rate."
          championIds={championIds}
        />
      </div>
    </div>
  );
}
