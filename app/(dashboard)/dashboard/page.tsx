import Link from "next/link";
import {
  currentStreak,
  FLEX_QUEUE,
  getLeaderboard,
  getLeaderboardRegions,
  getRecentFormByPlayer,
  getRecentMatchFeed,
  SOLO_QUEUE,
  type LeaderboardEntry,
} from "@/lib/leaderboard";
import { getBeastestHolder, BEASTEST_TOOLTIP } from "@/lib/beastest";
import { getGlobalChampionTrustLeaderboards } from "@/lib/champion-trust-leaderboard";
import { getRecentRankEvents } from "@/lib/rank-events";
import { describeRankEvent } from "@/lib/rank-event-labels";
import { isRemake } from "@/lib/derived-stats";
import { tierColor } from "@/lib/tier-colors";
import { cn, formatShortDate } from "@/lib/utils";
import {
  ChampionIcon,
  Eyebrow,
  FormStrip,
  LpBar,
  Panel,
  prettyTier,
  ResultPill,
  SectionTitle,
  TierEmblem,
  WinLossBar,
} from "@/components/lol";

export const dynamic = "force-dynamic";

const APEX = ["MASTER", "GRANDMASTER", "CHALLENGER"];

function hrefWith(params: { queue: string; region?: string }): string {
  const sp = new URLSearchParams();
  if (params.queue !== SOLO_QUEUE) sp.set("queue", params.queue);
  if (params.region) sp.set("region", params.region);
  const qs = sp.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

function Segmented({
  label,
  options,
}: {
  label: string;
  options: { label: string; href: string; active: boolean }[];
}) {
  return (
    <nav aria-label={label} className="flex gap-1 rounded-[10px] border border-border bg-card p-1">
      {options.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          aria-current={o.active ? "page" : undefined}
          className={cn(
            "flex min-h-10 items-center rounded-[7px] px-4 text-sm transition-colors",
            o.active ? "bg-foreground font-semibold text-background" : "font-medium text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

function dayLabel(date: Date): string {
  return formatShortDate(date) === formatShortDate(new Date()) ? "Today" : formatShortDate(date);
}

function nextStepLabel(entry: LeaderboardEntry): string {
  if (APEX.includes(entry.tier)) return `${entry.leaguePoints} LP on the apex ladder`;
  const toGo = Math.max(0, 100 - entry.leaguePoints);
  return toGo === 0 ? "In promotion range" : `${toGo} LP to the next division`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; queue?: string }>;
}) {
  const params = await searchParams;
  const queue = params.queue === FLEX_QUEUE ? FLEX_QUEUE : SOLO_QUEUE;
  const region = params.region || undefined;

  const [entries, regions, form, recentGames, events, beastest, trust] = await Promise.all([
    getLeaderboard({ region, queue }),
    getLeaderboardRegions(),
    getRecentFormByPlayer(queue, 10),
    getRecentMatchFeed(6),
    getRecentRankEvents(5),
    getBeastestHolder(),
    getGlobalChampionTrustLeaderboards(),
  ]);

  const top = entries[0];
  const hottest = entries
    .map((e) => ({ entry: e, streak: currentStreak(form.get(e.id) ?? []) }))
    .filter((x) => x.streak?.kind === "W" && x.streak.count >= 2)
    .sort((a, b) => b.streak!.count - a.streak!.count)[0];
  const fraud = trust.fraudulentComfortPicks[0];
  const regionLabel = regions.length === 1 ? regions[0].toUpperCase() : `${regions.length} regions`;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-wide md:text-[44px]">
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {entries.length} friends on {regionLabel} · ranked by {queue === FLEX_QUEUE ? "flex" : "solo queue"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {regions.length > 1 && (
            <Segmented
              label="Region"
              options={[
                { label: "All", href: hrefWith({ queue }), active: !region },
                ...regions.map((r) => ({
                  label: r.toUpperCase(),
                  href: hrefWith({ queue, region: r }),
                  active: region === r,
                })),
              ]}
            />
          )}
          <Segmented
            label="Queue"
            options={[
              { label: "Solo / Duo", href: hrefWith({ queue: SOLO_QUEUE, region }), active: queue === SOLO_QUEUE },
              { label: "Flex", href: hrefWith({ queue: FLEX_QUEUE, region }), active: queue === FLEX_QUEUE },
            ]}
          />
        </div>
      </header>

      {entries.length === 0 ? (
        <Panel className="border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          No ranked players yet. Add your squad under{" "}
          <Link href="/players" className="font-semibold text-foreground underline">
            Players
          </Link>{" "}
          and sync to build the leaderboard.
        </Panel>
      ) : (
        <>
          <section
            aria-label="Highlights"
            className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 [&>*]:w-[78%] [&>*]:shrink-0 [&>*]:snap-start md:[&>*]:w-auto"
          >
            {top && (
              <Panel className="flex flex-col gap-3 p-5">
                <Eyebrow className="text-brand">Top of the lobby</Eyebrow>
                <Link href={`/players/${top.id}`} className="flex items-center gap-4">
                  <TierEmblem tier={top.tier} size={44} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[17px] font-semibold">
                      {top.gameName} <span className="font-medium text-faint">#{top.tagLine}</span>
                    </span>
                    <span className={cn("font-display text-2xl font-semibold", tierColor(top.tier))}>
                      {prettyTier(top.tier, top.rank)} · {top.leaguePoints} LP
                    </span>
                  </div>
                </Link>
                <p className="text-[13px] text-muted-foreground">{nextStepLabel(top)}</p>
              </Panel>
            )}

            <Panel className="flex flex-col gap-3 p-5">
              <Eyebrow className="text-win">On fire</Eyebrow>
              {hottest ? (
                <Link href={`/players/${hottest.entry.id}`} className="flex flex-col gap-0.5">
                  <span className="text-[17px] font-semibold">
                    {hottest.entry.gameName} <span className="font-medium text-faint">#{hottest.entry.tagLine}</span>
                  </span>
                  <span className="font-display text-2xl font-semibold text-win">
                    {hottest.streak!.count} wins in a row
                  </span>
                </Link>
              ) : (
                <span className="font-display text-2xl font-semibold text-muted-foreground">Nobody on a streak</span>
              )}
              <p className="text-[13px] text-muted-foreground">
                {hottest ? `${prettyTier(hottest.entry.tier, hottest.entry.rank)} · ${hottest.entry.leaguePoints} LP` : "Win two in a row to show up here."}
              </p>
            </Panel>

            <Panel className="flex flex-col gap-3 p-5">
              <Eyebrow className="text-loss">Fraud watch</Eyebrow>
              {fraud ? (
                <Link href={`/players/${fraud.playerId}`} className="flex flex-col gap-0.5">
                  <span className="text-[17px] font-semibold">
                    {fraud.gameName} <span className="font-medium text-faint">#{fraud.tagLine}</span>
                  </span>
                  <span className="font-display text-2xl font-semibold text-loss">
                    {fraud.championName} · {Math.round(fraud.winrate)}% over {fraud.games} games
                  </span>
                </Link>
              ) : (
                <span className="font-display text-2xl font-semibold text-muted-foreground">No frauds detected</span>
              )}
              <p className="text-[13px] text-muted-foreground">
                {fraud ? "Most played, still losing." : "Everyone’s comfort picks are holding up."}{" "}
                <Link href="/champion-trust" className="underline underline-offset-2 hover:text-foreground">
                  Champion trust
                </Link>
              </p>
            </Panel>
          </section>

          <div className="grid items-start gap-6 min-[1500px]:grid-cols-[minmax(0,1fr)_320px]">
            <Panel aria-label="Standings" className="min-w-0 overflow-hidden">
              <div className="hidden grid-cols-[36px_minmax(0,1.5fr)_minmax(190px,1.3fr)_128px_minmax(150px,1fr)] gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint md:grid">
                <div>#</div>
                <div>Player</div>
                <div>Rank</div>
                <div>Last 5</div>
                <div>Season</div>
              </div>
              <ol>
                {entries.map((e, i) => {
                  const results = (form.get(e.id) ?? []).slice(0, 5);
                  const isBeastest = beastest?.id === e.id;
                  return (
                    <li key={e.id} className="border-b border-[#1e2228] last:border-b-0">
                      <Link
                        href={`/players/${e.id}`}
                        className="grid min-h-14 grid-cols-[22px_auto_minmax(0,1fr)] items-center gap-3 px-3.5 py-3 transition-colors hover:bg-surface-2/60 md:grid-cols-[36px_minmax(0,1.5fr)_minmax(190px,1.3fr)_128px_minmax(150px,1fr)] md:gap-4 md:px-5 md:py-0"
                      >
                        <span className="font-display text-lg font-bold text-faint md:text-xl">{i + 1}</span>

                        {/* phone: emblem + two-line summary */}
                        <TierEmblem tier={e.tier} size={26} className="md:hidden" />
                        <div className="flex min-w-0 flex-col gap-1 md:hidden">
                          <div className="flex justify-between gap-2">
                            <span className="truncate text-[15px] font-semibold">{e.gameName}</span>
                            <span className={cn("shrink-0 font-display text-[17px] font-bold", tierColor(e.tier))}>
                              {prettyTier(e.tier, e.rank)} · {e.leaguePoints}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <FormStrip results={results} variant="bars" />
                            <span className="text-xs text-muted-foreground">
                              {e.wins}W {e.losses}L{e.winrate != null ? ` · ${Math.round(e.winrate)}%` : ""}
                            </span>
                          </div>
                        </div>

                        {/* desktop columns */}
                        <div className="hidden min-w-0 items-center gap-2 md:flex">
                          <span className="truncate text-[15px] font-semibold">
                            {e.gameName} <span className="font-medium text-faint">#{e.tagLine}</span>
                          </span>
                          {isBeastest && (
                            <span
                              title={BEASTEST_TOOLTIP}
                              className="shrink-0 rounded-md bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand"
                            >
                              Beastest
                            </span>
                          )}
                        </div>
                        <div className="hidden min-w-0 items-center gap-3 md:flex">
                          <TierEmblem tier={e.tier} size={28} />
                          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <div className="flex justify-between gap-2 text-sm">
                              <span className={cn("font-semibold whitespace-nowrap", tierColor(e.tier))}>{prettyTier(e.tier, e.rank)}</span>
                              <span className="tabular-nums whitespace-nowrap text-muted-foreground">{e.leaguePoints} LP</span>
                            </div>
                            <LpBar tier={e.tier} lp={e.leaguePoints} />
                          </div>
                        </div>
                        <div className="hidden md:block">
                          <FormStrip results={results} />
                        </div>
                        <div className="hidden md:block">
                          <WinLossBar wins={e.wins} losses={e.losses} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </Panel>

            <aside className="grid min-w-0 items-start gap-6 md:max-[1499px]:grid-cols-2">
              <Panel aria-label="Rank changes" className="flex flex-col gap-3.5 p-5">
                <SectionTitle>Rank changes</SectionTitle>
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rank changes yet.</p>
                ) : (
                  events.map((e) => {
                    const c = describeRankEvent(e);
                    return (
                      <div key={e.id} className="flex items-start gap-3">
                        <span
                          className={cn(
                            "min-w-16 shrink-0 rounded-md px-2 py-0.5 text-center text-[11px] font-bold uppercase tracking-wider",
                            c.tone === "up" && "bg-win-soft text-win",
                            c.tone === "down" && "bg-loss-soft text-loss",
                            c.tone === "peak" && "bg-brand/15 text-brand"
                          )}
                        >
                          {c.kind}
                        </span>
                        <div className="flex flex-col gap-0.5 text-sm">
                          <div>
                            <Link href={`/players/${e.trackedPlayerId}`} className="font-semibold hover:underline">
                              {e.gameName}
                            </Link>{" "}
                            <span className="text-muted-foreground">{c.text}</span>
                          </div>
                          <span className="text-xs text-faint">{dayLabel(e.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </Panel>

              <Panel aria-label="Latest games" className="flex flex-col gap-2.5 p-5">
                <SectionTitle className="mb-1">Latest games</SectionTitle>
                {recentGames.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No games yet. Sync to fetch ranked matches.</p>
                ) : (
                  recentGames.map((g) => (
                    <Link
                      key={`${g.matchDbId}-${g.trackedPlayerId}`}
                      href={`/matches/${g.matchDbId}`}
                      className="flex min-h-10 items-center gap-3 rounded-lg transition-colors hover:bg-surface-2/60"
                    >
                      <ChampionIcon championId={g.championId} championName={g.championName} className="size-9" />
                      <div className="flex min-w-0 flex-1 flex-col text-sm">
                        <span className="truncate font-semibold">
                          {g.gameName} · {g.championName ?? "—"}
                        </span>
                        <span className="text-xs text-faint">
                          {g.kills} / {g.deaths} / {g.assists} · {g.queueId === 440 ? "Flex" : "Solo"} · {dayLabel(g.gameStartAt)}
                        </span>
                      </div>
                      <ResultPill win={g.win} remake={isRemake(g)} />
                    </Link>
                  ))
                )}
              </Panel>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
