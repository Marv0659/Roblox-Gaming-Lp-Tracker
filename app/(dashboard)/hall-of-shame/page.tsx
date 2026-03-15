import Link from "next/link";
import { getHallOfShame } from "@/lib/hall-of-shame";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function PlayerLink({
  id,
  gameName,
  tagLine,
}: {
  id: string;
  gameName: string;
  tagLine: string;
}) {
  return (
    <Link
      href={`/players/${id}`}
      className="font-medium text-foreground hover:text-primary"
    >
      {gameName}#{tagLine}
    </Link>
  );
}

function CategorySection({
  title,
  subtitle,
  entries,
  emptyMessage,
  valueClassName = "text-destructive",
}: {
  title: string;
  subtitle?: string;
  entries: { player: { id: string; gameName: string; tagLine: string }; value: number; label: string; detail?: string }[];
  emptyMessage: string;
  valueClassName?: string;
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
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="space-y-2">
            {entries.slice(0, 5).map((e) => (
              <li
                key={e.player.id}
                className="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
              >
                <PlayerLink {...e.player} />
                <div className="flex items-center gap-2 text-sm">
                  <span className={valueClassName}>{e.label}</span>
                  {e.detail && (
                    <Badge variant="secondary" className="font-normal text-xs">
                      {e.detail}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function HallOfShamePage() {
  const result = await getHallOfShame();

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Hall of shame
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Data-driven (but humorous) &quot;fraud index&quot; — all from synced
          match and rank data. Min sample sizes applied so no one gets roasted on
          one game.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <CategorySection
          title="Biggest LP loss (7d)"
          subtitle="Who bled the most LP this week"
          entries={result.biggestLpLoss7d}
          emptyMessage="No one with enough snapshots lost LP in the last 7 days. Lucky."
        />
        <CategorySection
          title="Worst recent winrate"
          subtitle="Cold streak central"
          entries={result.worstRecentWinrate}
          emptyMessage="No one with enough recent games qualifies. Go touch grass."
        />
        <CategorySection
          title="Most deaths per game"
          subtitle="Feeding index"
          entries={result.mostDeathsPerGame}
          emptyMessage="No one with enough games in the sample. Suspiciously clean."
        />
        <CategorySection
          title="Most games spammed, poor results"
          subtitle="Played a lot, didn’t go so well"
          entries={result.mostGamesSpammedPoorResults}
          emptyMessage="No one spammed 3+ games with &lt;40% WR in the last 7 days."
        />
        <CategorySection
          title="Biggest drop from peak"
          subtitle="Fell off the ladder"
          entries={result.biggestDropFromPeak}
          emptyMessage="No one dropped from their recent peak. Yet."
        />
        <CategorySection
          title="Worst champion stubbornness"
          subtitle="Kept picking a low-WR champ"
          entries={result.worstChampionStubbornness}
          emptyMessage="No one stuck to a bad champ enough to qualify."
          valueClassName="text-amber-500"
        />
      </div>
    </div>
  );
}
