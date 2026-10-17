import Link from "next/link";
import { cn, formatDate, formatShortDate } from "@/lib/utils";
import { getWeeklyRecap, type RecapHighlight, type StinkerEntry } from "@/lib/recap";
import {
  FLEX_QUEUE,
  QUEUE_LABEL_BY_TYPE,
  SOLO_QUEUE,
  type RankedQueueType,
} from "@/lib/leaderboard";
import { Eyebrow, Panel, SectionTitle, Segmented } from "@/components/lol";

export const dynamic = "force-dynamic";

type QueuePreset = "solo" | "flex";

const QUEUE_PRESET_TO_TYPE: Record<QueuePreset, RankedQueueType> = {
  solo: SOLO_QUEUE,
  flex: FLEX_QUEUE,
};

const VERDICT_TONE: Record<string, string> = {
  YES: "text-win",
  ONLY_WITH_SUPERVISION: "text-brand",
  ONLY_IF_NOT_LOCKING_THAT_CHAMP: "text-[#c9aeff]",
  NO: "text-loss",
  ABSOLUTELY_NOT: "text-loss",
};

function parseQueuePreset(value?: string): QueuePreset {
  return value === "flex" ? "flex" : "solo";
}

function formatWindow(window: { start: Date; end: Date }): string {
  return `${formatShortDate(window.start)} – ${formatShortDate(window.end)} ${formatDate(window.end).slice(-4)}`;
}

function verdictText(label: string, badChampionName?: string): string {
  if (label === "ONLY_IF_NOT_LOCKING_THAT_CHAMP" && badChampionName) return `Not on ${badChampionName}`;
  return label.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function PlayerName({ playerId, gameName, tagLine }: { playerId: string; gameName: string; tagLine: string }) {
  return (
    <Link href={`/players/${playerId}`} className="truncate text-[17px] font-semibold hover:underline">
      {gameName} <span className="font-medium text-faint">#{tagLine}</span>
    </Link>
  );
}

function HighlightCard({
  title,
  highlight,
  tone,
  empty,
}: {
  title: string;
  highlight: RecapHighlight | null;
  tone?: string;
  empty: string;
}) {
  return (
    <Panel className="flex min-w-0 flex-col gap-2 p-5">
      <Eyebrow className={tone}>{title}</Eyebrow>
      {highlight ? (
        <>
          <PlayerName {...highlight} />
          <span className={cn("font-display text-3xl font-bold leading-none tabular-nums", tone)}>
            {highlight.label ?? highlight.value}
          </span>
        </>
      ) : (
        <span className="font-display text-2xl font-semibold text-muted-foreground">{empty}</span>
      )}
    </Panel>
  );
}

function StinkerLine({ label, entry, stat }: { label: string; entry: StinkerEntry; stat: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Eyebrow>{label}</Eyebrow>
      <p className="text-sm">
        <Link href={`/players/${entry.playerId}`} className="font-semibold hover:underline">
          {entry.gameName}
        </Link>
        {entry.championName && <span className="text-muted-foreground"> on {entry.championName}</span>}
      </p>
      <Link
        href={`/matches/${entry.matchDbId}`}
        className="font-display text-2xl font-bold leading-none text-loss tabular-nums hover:underline"
      >
        {entry.kills} / {entry.deaths} / {entry.assists}
        <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">{stat}</span>
      </Link>
    </div>
  );
}

export default async function RecapPage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string }>;
}) {
  const params = await searchParams;
  const queuePreset = parseQueuePreset(params.queue);
  const queueType = QUEUE_PRESET_TO_TYPE[queuePreset];
  const recap = await getWeeklyRecap(queueType);

  const topGrinders = [...recap.playerStats]
    .filter((p) => p.gamesPlayed > 0)
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
    .slice(0, 5);
  const { worstKda, mostDeaths } = recap.stinkerOfTheWeek;
  const loser = recap.biggestLpLoser && recap.biggestLpLoser.value < 0 ? recap.biggestLpLoser : null;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-wide md:text-[44px]">
            This week
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatWindow(recap.window)} · {QUEUE_LABEL_BY_TYPE[queueType]} · synced games only
          </p>
        </div>
        <Segmented
          label="Queue"
          options={[
            { label: "Solo / Duo", href: "/recap?queue=solo", active: queuePreset === "solo" },
            { label: "Flex", href: "/recap?queue=flex", active: queuePreset === "flex" },
          ]}
        />
      </header>

      {recap.playerStats.length === 0 ? (
        <Panel className="border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          No tracked players or no activity this week. Add players and sync to see the recap.
        </Panel>
      ) : (
        <>
          <section aria-label="Highlights" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
            <HighlightCard title="Biggest LP gain" highlight={recap.biggestLpGainer} tone="text-win" empty="Nobody climbed" />
            <HighlightCard title="Biggest LP loss" highlight={loser} tone="text-loss" empty="No bums yet" />
            <HighlightCard title="Most games" highlight={recap.mostGames} empty="Nobody played" />
            <HighlightCard title="Best win rate" highlight={recap.bestWinrate} tone="text-win" empty="Not enough games" />
            <HighlightCard title="Worst win rate" highlight={recap.worstWinrate} tone="text-loss" empty="Not enough games" />
            <HighlightCard title="Longest win streak" highlight={recap.longestWinStreak} tone="text-brand" empty="No streaks" />
          </section>

          {(recap.roughWeek || worstKda || mostDeaths) && (
            <div className="grid gap-3 md:grid-cols-2 md:gap-4">
              {recap.roughWeek && (
                <Panel aria-label="Rough week" className="flex flex-col gap-2 border-brand/40 p-5">
                  <Eyebrow className="text-brand">Rough week</Eyebrow>
                  <PlayerName {...recap.roughWeek} />
                  <p className="text-sm text-[#cdd2d9]">
                    {recap.roughWeek.reason}
                    {recap.roughWeek.lpChange != null && recap.roughWeek.lpChange < 0 && (
                      <span className="text-loss"> · {recap.roughWeek.lpChange} LP</span>
                    )}
                  </p>
                  <p className="text-xs text-faint">Played a lot, didn’t go so well.</p>
                </Panel>
              )}
              {(worstKda || mostDeaths) && (
                <Panel aria-label="Stinker of the week" className="flex flex-col gap-4 border-loss-solid/40 p-5">
                  <Eyebrow className="text-loss">Stinker of the week</Eyebrow>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {worstKda && <StinkerLine label="Worst KDA" entry={worstKda} stat={`${worstKda.kda.toFixed(2)} KDA`} />}
                    {mostDeaths && <StinkerLine label="Most deaths" entry={mostDeaths} stat={`${mostDeaths.deaths} deaths`} />}
                  </div>
                  <p className="text-xs text-faint">Yeah, mid fed guys…</p>
                </Panel>
              )}
            </div>
          )}

          {topGrinders.length > 0 && (
            <Panel aria-label="Most games" className="flex flex-col gap-3 p-5">
              <SectionTitle>On the grind</SectionTitle>
              <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {topGrinders.map((p, i) => (
                  <li key={p.playerId} className="flex min-w-0 flex-col gap-1 rounded-xl bg-surface-2 p-4">
                    <span className="font-display text-sm font-bold text-faint">#{i + 1}</span>
                    <span className="font-display text-3xl font-bold leading-none tabular-nums">{p.gamesPlayed}</span>
                    <span className="text-xs text-faint">
                      games{p.winrate != null ? ` · ${Math.round(p.winrate)}%` : ""}
                    </span>
                    <Link href={`/players/${p.playerId}`} className="truncate text-sm font-semibold hover:underline">
                      {p.gameName}
                    </Link>
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          {recap.queueRecommendations && recap.queueRecommendations.length > 0 && (
            <Panel aria-label="Should they queue" className="overflow-hidden">
              <div className="flex flex-col gap-1 border-b border-border px-5 py-4">
                <SectionTitle>Should they queue?</SectionTitle>
                <p className="text-xs text-faint">Rule-based verdicts for every tracked player.</p>
              </div>
              <ul>
                {recap.queueRecommendations
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((r) => (
                    <li
                      key={r.playerId}
                      className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[#1e2228] px-5 py-2.5 last:border-b-0"
                    >
                      <Link href={`/players/${r.playerId}`} className="min-w-0 truncate text-sm font-semibold hover:underline">
                        {r.gameName} <span className="font-medium text-faint">#{r.tagLine}</span>
                      </Link>
                      <span className="flex shrink-0 items-baseline gap-3">
                        <span
                          className={cn(
                            "font-display text-lg font-bold uppercase",
                            VERDICT_TONE[r.label] ?? "text-foreground"
                          )}
                        >
                          {verdictText(r.label, r.badChampionName)}
                        </span>
                        <span className="w-14 text-right text-xs tabular-nums text-faint">{Math.round(r.score)} / 100</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
