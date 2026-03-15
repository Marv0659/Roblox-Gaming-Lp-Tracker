import Link from "next/link";
import { getHallOfFame } from "@/lib/hall-of-fame";
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
  valueClassName = "text-emerald-600 dark:text-emerald-400",
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
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
              >
                <PlayerLink {...e.player} />
                <div className="flex items-center gap-2 text-sm">
                  <span className={valueClassName}>{e.label}</span>
                  {e.detail && (
                    <Badge variant="secondary" className="text-xs font-normal">
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

export default async function HallOfFamePage() {
  const result = await getHallOfFame();

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Hall of fame
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Data-driven &quot;best of&quot; — biggest climbers, hot streaks, and
          clean play. Same synced data as the hall of shame, just the nice bits.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <CategorySection
          title="Biggest LP gain (7d)"
          subtitle="Who gained the most LP this week"
          entries={result.biggestLpGain7d}
          emptyMessage="No one with enough snapshots gained LP in the last 7 days."
        />
        <CategorySection
          title="Best recent winrate"
          subtitle="Hot streak central"
          entries={result.bestRecentWinrate}
          emptyMessage="No one with enough recent games qualifies yet."
        />
        <CategorySection
          title="Fewest deaths per game"
          subtitle="Clean play"
          entries={result.fewestDeathsPerGame}
          emptyMessage="No one with enough games in the sample."
        />
        <CategorySection
          title="Most games, great results"
          subtitle="Played a lot and won"
          entries={result.mostGamesGreatResults}
          emptyMessage="No one played 3+ games with 60%+ WR in the last 7 days."
        />
        <CategorySection
          title="Biggest climb from low"
          subtitle="Bounced back on the ladder"
          entries={result.biggestClimbFromLow}
          emptyMessage="No one climbed from a recent low. Yet."
        />
        <CategorySection
          title="Best champion mastery"
          subtitle="Dominating on a pick"
          entries={result.bestChampionMastery}
          emptyMessage="No one has 4+ games on a champ with 60%+ WR yet."
          valueClassName="text-amber-500 dark:text-amber-400"
        />
      </div>
    </div>
  );
}
