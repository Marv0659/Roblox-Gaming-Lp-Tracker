import Link from "next/link";
import { getGlobalChampionTrustLeaderboards } from "@/lib/champion-trust-leaderboard";
import type { GlobalChampionTrustRow } from "@/lib/champion-trust-leaderboard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function TrustRow({ row }: { row: GlobalChampionTrustRow }) {
  return (
    <Link
      href={`/players/${row.playerId}`}
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm transition-colors hover:bg-muted/40"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">
          {row.gameName}#{row.tagLine}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="font-medium text-foreground">{row.championName}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
        <span className="tabular-nums">{row.games} g</span>
        <span>{row.winrate.toFixed(0)}% WR</span>
        <span className="text-xs">{row.shortReason}</span>
      </div>
    </Link>
  );
}

function CategoryCard({
  title,
  subtitle,
  rows,
  emptyMessage,
}: {
  title: string;
  subtitle?: string;
  rows: GlobalChampionTrustRow[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row, i) => (
              <li key={`${row.playerId}-${row.championName}-${i}`}>
                <TrustRow row={row} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ChampionTrustPage() {
  const data = await getGlobalChampionTrustLeaderboards();

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Champion trust leaderboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Data-driven fraud and trust rankings across the squad. Who has the
          worst comfort picks, the best pocket picks, and the biggest coinflips.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <CategoryCard
          title="Most fraudulent comfort picks"
          subtitle="Play it a lot, results are poor"
          rows={data.fraudulentComfortPicks}
          emptyMessage="No one has qualified yet. Need 5+ games on a top-3 most played champ with &lt;45% WR."
        />
        <CategoryCard
          title="Most trusted picks"
          subtitle="Strong sample, reliably good"
          rows={data.mostTrustedPicks}
          emptyMessage="No trusted picks yet. Need 5+ games and 58%+ WR with stable recent results."
        />
        <CategoryCard
          title="Biggest coinflip picks"
          subtitle="Volatile, inconsistent"
          rows={data.coinflipPicks}
          emptyMessage="No coinflip picks yet."
        />
        <CategoryCard
          title="Worst stubborn picks"
          subtitle="Many games, poor results, kept picking it"
          rows={data.worstStubbornPicks}
          emptyMessage="No one has 5+ games with ≤40% WR on a champ yet."
        />
        <CategoryCard
          title="Hidden pocket picks"
          subtitle="Lower volume but surprisingly strong (3–8 games, 60%+ WR)"
          rows={data.hiddenPocketPicks}
          emptyMessage="No pocket picks yet. Need 3–8 games with 60%+ WR."
        />
      </div>
    </div>
  );
}
