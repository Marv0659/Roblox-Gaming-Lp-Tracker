import { getHallOfShame } from "@/lib/hall-of-shame";
import { AwardCategory } from "@/components/award-board";

export const dynamic = "force-dynamic";

export default async function HallOfShamePage() {
  const result = await getHallOfShame();

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-wide md:text-[44px]">
          Hall of shame
        </h1>
        <p className="text-sm text-muted-foreground">
          The fraud index, straight from synced match and rank data. Minimum sample sizes apply, so nobody gets
          roasted for one game.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
        <AwardCategory
          title="Biggest LP loss · 7 days"
          subtitle="Who bled the most LP this week"
          entries={result.biggestLpLoss7d}
          emptyMessage="No one with enough snapshots lost LP in the last 7 days. Lucky."
          tone="loss"
        />
        <AwardCategory
          title="Worst recent win rate"
          subtitle="Cold streak central"
          entries={result.worstRecentWinrate}
          emptyMessage="No one with enough recent games qualifies. Go touch grass."
          tone="loss"
        />
        <AwardCategory
          title="Most deaths per game"
          subtitle="Feeding index"
          entries={result.mostDeathsPerGame}
          emptyMessage="No one with enough games in the sample. Suspiciously clean."
          tone="loss"
        />
        <AwardCategory
          title="Spammed games, poor results"
          subtitle="Played a lot, didn’t go so well"
          entries={result.mostGamesSpammedPoorResults}
          emptyMessage="No one spammed 3+ games under 40% win rate in the last 7 days."
          tone="loss"
        />
        <AwardCategory
          title="Biggest drop from peak"
          subtitle="Fell off the ladder"
          entries={result.biggestDropFromPeak}
          emptyMessage="No one dropped from their recent peak. Yet."
          tone="loss"
        />
        <AwardCategory
          title="Champion stubbornness"
          subtitle="Kept picking a low win rate champion"
          entries={result.worstChampionStubbornness}
          emptyMessage="No one stuck to a bad champion enough to qualify."
          tone="brand"
        />
      </div>
    </div>
  );
}
