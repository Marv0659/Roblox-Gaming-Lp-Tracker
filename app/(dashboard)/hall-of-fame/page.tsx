import { getHallOfFame } from "@/lib/hall-of-fame";
import { AwardCategory } from "@/components/award-board";

export const dynamic = "force-dynamic";

export default async function HallOfFamePage() {
  const result = await getHallOfFame();

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-wide md:text-[44px]">
          Hall of fame
        </h1>
        <p className="text-sm text-muted-foreground">
          Biggest climbers, hot streaks and clean play. Same synced data as the hall of shame, just the nice bits.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
        <AwardCategory
          title="Biggest LP gain · 7 days"
          subtitle="Who gained the most LP this week"
          entries={result.biggestLpGain7d}
          emptyMessage="No one with enough snapshots gained LP in the last 7 days."
          tone="win"
        />
        <AwardCategory
          title="Best recent win rate"
          subtitle="Hot streak central"
          entries={result.bestRecentWinrate}
          emptyMessage="No one with enough recent games qualifies yet."
          tone="win"
        />
        <AwardCategory
          title="Fewest deaths per game"
          subtitle="Clean play"
          entries={result.fewestDeathsPerGame}
          emptyMessage="No one with enough games in the sample."
          tone="win"
        />
        <AwardCategory
          title="Most games, great results"
          subtitle="Played a lot and won"
          entries={result.mostGamesGreatResults}
          emptyMessage="No one played 3+ games with 60%+ win rate in the last 7 days."
          tone="win"
        />
        <AwardCategory
          title="Biggest climb from low"
          subtitle="Bounced back on the ladder"
          entries={result.biggestClimbFromLow}
          emptyMessage="No one climbed from a recent low. Yet."
          tone="win"
        />
        <AwardCategory
          title="Best champion mastery"
          subtitle="Dominating on a pick"
          entries={result.bestChampionMastery}
          emptyMessage="No one has 4+ games on a champion with 60%+ win rate yet."
          tone="brand"
        />
      </div>
    </div>
  );
}
