import Link from "next/link";
import { getGlobalChampionTrustLeaderboards } from "@/lib/champion-trust-leaderboard";
import type { GlobalChampionTrustRow } from "@/lib/champion-trust-leaderboard";
import type { ChampionTrustLabel } from "@/lib/champion-trust";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function ChampionTrustBadge({ label }: { label: ChampionTrustLabel }) {
  const styles: Record<ChampionTrustLabel, string> = {
    TRUSTED: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    COINFLIP: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
    DO_NOT_ALLOW: "bg-destructive/20 text-destructive border-destructive/30",
    FAKE_COMFORT_PICK: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30",
    POCKET_PICK: "bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30",
    INSUFFICIENT_DATA: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium uppercase tracking-wide", styles[label])}
    >
      {label.replace(/_/g, " ")}
    </Badge>
  );
}

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
        <ChampionTrustBadge label={row.trustLabel} />
      </div>
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 text-muted-foreground">
        <span className="tabular-nums">{row.games} games</span>
        <span>{row.winrate.toFixed(0)}% WR</span>
        <span className="text-xs">{row.shortReason}</span>
      </div>
    </Link>
  );
}

function CategoryCard({
  title,
  description,
  rows,
  emptyMessage,
}: {
  title: string;
  description: string;
  rows: GlobalChampionTrustRow[];
  emptyMessage: string;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="shrink-0">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="col-span-full mb-1 mt-6 border-t border-border pt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground first:mt-0 first:border-t-0 first:pt-0">
      {children}
    </h2>
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <SectionHeading>Fraud &amp; stubborn</SectionHeading>
        <CategoryCard
          title="🚨 FRAUD WATCH 🚨"
          description="They play it a lot; results don’t back it up."
          rows={data.fraudulentComfortPicks}
          emptyMessage="No one has qualified yet. Need 5+ games on a top-3 most played champ with &lt;45% WR."
        />
        <CategoryCard
          title="Worst stubborn picks"
          description="Many games, poor results, still locking it in."
          rows={data.worstStubbornPicks}
          emptyMessage="No one has 5+ games with ≤40% WR on a champ yet."
        />

        <SectionHeading>Volatile</SectionHeading>
        <CategoryCard
          title="Biggest coinflips"
          description="Could go either way; inconsistent performance."
          rows={data.coinflipPicks}
          emptyMessage="No coinflip picks yet."
        />

        <SectionHeading>Trust &amp; pocket</SectionHeading>
        <CategoryCard
          title="Most trusted"
          description="Strong sample size, reliably good performance."
          rows={data.mostTrustedPicks}
          emptyMessage="No trusted picks yet. Need 5+ games and 58%+ WR with stable recent results."
        />
        <CategoryCard
          title="Hidden pocket picks"
          description="Low volume but surprisingly strong (3–8 games, 60%+ WR)."
          rows={data.hiddenPocketPicks}
          emptyMessage="No pocket picks yet. Need 3–8 games with 60%+ WR."
        />
      </div>
    </div>
  );
}
