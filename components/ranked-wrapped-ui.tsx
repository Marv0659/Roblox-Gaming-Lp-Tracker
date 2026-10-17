import Link from "next/link";
import {
  type RankedWrappedBundle,
  type PlayerRankedWrapped,
  type GroupAward,
  type WrappedRankPoint,
} from "@/lib/ranked-wrapped";
import { tierColor } from "@/lib/tier-colors";
import { cn } from "@/lib/utils";
import { ChampionIcon, Eyebrow, Panel, SectionTitle, StatTile, TierEmblem } from "@/components/lol";

const TONE_DOT: Record<"good" | "bad" | "neutral", string> = {
  good: "bg-win-solid",
  bad: "bg-loss-solid",
  neutral: "bg-faint",
};

function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${n}`;
}

function lpTone(n: number): string {
  return n > 0 ? "text-win" : n < 0 ? "text-loss" : "text-foreground";
}

export function RankedWrappedShell({
  bundle,
  selectedPlayerId,
  championIds = {},
}: {
  bundle: RankedWrappedBundle;
  selectedPlayerId?: string;
  championIds?: Record<string, number>;
}) {
  const { group, players } = bundle;
  const selected = selectedPlayerId ? players.find((p) => p.playerId === selectedPlayerId) : undefined;

  const pill = (active: boolean) =>
    cn(
      "flex min-h-10 shrink-0 items-center rounded-[7px] px-4 text-sm whitespace-nowrap transition-colors",
      active ? "bg-foreground font-semibold text-background" : "font-medium text-muted-foreground hover:text-foreground"
    );

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-wide md:text-[44px]">
            Ranked Wrapped
          </h1>
          <p className="text-sm text-muted-foreground">
            {group.scope.label} · {group.squadSize} tracked · {group.totalRankedGames} ranked games
          </p>
        </div>
        <nav
          aria-label="Wrapped for"
          className="flex max-w-full gap-1 self-start overflow-x-auto rounded-[10px] border border-border bg-card p-1"
        >
          <Link
            href="/ranked-wrapped"
            aria-current={!selected ? "page" : undefined}
            className={pill(!selected)}
          >
            Squad
          </Link>
          {players.map((p) => (
            <Link
              key={p.playerId}
              href={`/ranked-wrapped?player=${encodeURIComponent(p.playerId)}`}
              aria-current={selected?.playerId === p.playerId ? "page" : undefined}
              className={pill(selected?.playerId === p.playerId)}
            >
              {p.gameName}
            </Link>
          ))}
        </nav>
      </header>

      {selected ? <PlayerWrappedBody p={selected} championIds={championIds} /> : <GroupWrappedBody group={group} />}
    </div>
  );
}

function Narrative({ eyebrow, headline, lines }: { eyebrow: string; headline: string; lines: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      <Eyebrow className="text-brand">{eyebrow}</Eyebrow>
      <p className="max-w-3xl font-display text-2xl font-bold leading-tight md:text-3xl">{headline}</p>
      {lines.length > 0 && (
        <ul className="flex max-w-3xl flex-col gap-1.5 text-sm text-[#cdd2d9]">
          {lines.map((line, i) => (
            <li key={i} className="flex gap-2.5">
              <span aria-hidden className="mt-[7px] inline-block size-1.5 shrink-0 rotate-45 rounded-[1px] bg-brand" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GroupWrappedBody({ group }: { group: RankedWrappedBundle["group"] }) {
  return (
    <>
      <Panel aria-label="Squad story" className="flex flex-col gap-5 p-5 md:p-6">
        <Narrative eyebrow="Squad story" headline={group.narrative.headline} lines={group.narrative.lines} />
        <div className="flex flex-wrap gap-3">
          {group.avgWinrate != null && (
            <div className="flex flex-col gap-1 rounded-xl bg-surface-2 px-4 py-3">
              <Eyebrow>Squad win rate</Eyebrow>
              <span className="font-display text-2xl font-bold leading-none tabular-nums">
                {group.avgWinrate.toFixed(1)}%
              </span>
            </div>
          )}
          {group.duoHighlight && (
            <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-surface-2 px-4 py-3">
              <Eyebrow>Duo of the season</Eyebrow>
              <span className="font-display text-2xl font-bold leading-none">
                {group.duoHighlight.playerA} <span className="text-faint">+</span> {group.duoHighlight.playerB}
              </span>
              <span className="text-xs text-muted-foreground">
                {group.duoHighlight.games} games ·{" "}
                <span className="text-win">{group.duoHighlight.winrate.toFixed(0)}%</span>
              </span>
            </div>
          )}
        </div>
      </Panel>

      <section aria-label="Awards" className="flex flex-col gap-3">
        <SectionTitle>Awards</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
          {group.awards.map((a) => (
            <AwardCard key={a.id} award={a} />
          ))}
        </div>
      </section>
    </>
  );
}

function AwardCard({ award }: { award: GroupAward }) {
  return (
    <Panel className="flex min-w-0 flex-col gap-2 p-5">
      <Eyebrow className="text-brand">{award.title}</Eyebrow>
      {award.winner ? (
        <Link href={`/players/${award.winner.playerId}`} className="truncate text-[17px] font-semibold hover:underline">
          {award.winner.gameName} <span className="font-medium text-faint">#{award.winner.tagLine}</span>
        </Link>
      ) : (
        <span className="text-[17px] font-semibold text-muted-foreground">No data yet</span>
      )}
      {award.winner && award.stat && (
        <span className="font-display text-2xl font-bold leading-none tabular-nums">{award.stat}</span>
      )}
      <p className="text-xs text-faint">{award.subtitle}</p>
    </Panel>
  );
}

function RankBox({ label, point }: { label: string; point: WrappedRankPoint | null }) {
  return (
    <div className="flex min-w-[180px] flex-1 items-center gap-3 rounded-xl bg-surface-2 p-4">
      <TierEmblem tier={point?.tier} size={40} />
      <div className="flex min-w-0 flex-col gap-1">
        <Eyebrow>{label}</Eyebrow>
        <span className={cn("font-display text-xl font-bold leading-none", point ? tierColor(point.tier) : "text-muted-foreground")}>
          {point?.label ?? "Unranked"}
        </span>
      </div>
    </div>
  );
}

function ChampionRow({
  label,
  name,
  detail,
  tone,
  championId,
}: {
  label: string;
  name: string;
  detail: string;
  tone?: string;
  championId?: number;
}) {
  return (
    <div className="flex min-h-10 items-center gap-3">
      <ChampionIcon championId={championId} championName={name} className="size-9" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-sm font-semibold", tone)}>{name}</span>
        <span className="text-xs text-faint">{detail}</span>
      </div>
      <Eyebrow className="shrink-0">{label}</Eyebrow>
    </div>
  );
}

function PlayerWrappedBody({ p, championIds }: { p: PlayerRankedWrapped; championIds: Record<string, number> }) {
  const trust = p.championTrust;
  const hasTrust = trust.trusted || trust.fakeComfort || trust.coinflip;

  return (
    <>
      <Panel aria-label="Season story" className="flex flex-col gap-5 p-5 md:p-6">
        <div className="flex flex-col gap-2">
          <span className="self-start rounded-full bg-brand/15 px-2.5 py-1 text-xs font-semibold text-brand">
            {p.funTitle}
          </span>
          <h2 className="font-display text-4xl font-bold leading-none break-words md:text-5xl">
            <Link href={`/players/${p.playerId}`} className="hover:underline">
              {p.gameName}
            </Link>{" "}
            <span className="font-semibold text-faint">#{p.tagLine}</span>
          </h2>
        </div>
        <Narrative eyebrow="The season so far" headline={p.narrative.headline} lines={p.narrative.lines} />
        <div className="flex flex-wrap gap-3">
          <RankBox label="Current" point={p.currentRank} />
          <RankBox label="Peak" point={p.highestRank} />
          <div className="flex min-w-[140px] flex-1 flex-col justify-center gap-1 rounded-xl bg-surface-2 p-4">
            <Eyebrow>Net LP · solo</Eyebrow>
            <span className={cn("font-display text-2xl font-bold leading-none tabular-nums", lpTone(p.netLpSolo))}>
              {signed(p.netLpSolo)}
            </span>
          </div>
        </div>
        {p.peakToCurrentDrop && (
          <p className="text-sm text-muted-foreground">
            <span className="text-loss">Down from peak:</span> {p.peakToCurrentDrop.peakLabel} →{" "}
            {p.peakToCurrentDrop.currentLabel}
          </p>
        )}
      </Panel>

      <section aria-label="Season numbers" className="flex flex-col gap-3">
        <SectionTitle>Season numbers</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <StatTile label="Ranked games" value={p.rankedGamesPlayed} sub="Solo + flex, remakes excluded" />
          <StatTile
            label="Win rate"
            value={p.overallWinrate != null ? `${p.overallWinrate.toFixed(1)}%` : "—"}
            sub={p.longestWinStreak || p.longestLossStreak ? `Best run W${p.longestWinStreak} · worst L${p.longestLossStreak}` : undefined}
          />
          <StatTile
            label="Net LP · solo"
            value={<span className={lpTone(p.netLpSolo)}>{signed(p.netLpSolo)}</span>}
            sub={`+${p.grossLpGained} gained / ${p.grossLpLost} lost`}
          />
          <StatTile
            label="LP last 7 days"
            value={<span className={lpTone(p.derived.lpGained7d)}>{signed(p.derived.lpGained7d)}</span>}
            sub={`${signed(p.derived.lpGained30d)} over 30 days`}
          />
          <StatTile
            label="Current streak"
            value={
              p.derived.currentWinStreak > 0 ? (
                <span className="text-win">W{p.derived.currentWinStreak}</span>
              ) : p.derived.currentLossStreak > 0 ? (
                <span className="text-loss">L{p.derived.currentLossStreak}</span>
              ) : (
                "—"
              )
            }
            sub="From the most recent games"
          />
          <StatTile
            label="Best / worst stretch"
            value={
              <>
                <span className="text-win">{p.bestStretch.winsInWindow}</span>
                <span className="text-faint"> / </span>
                <span className="text-loss">{p.worstCollapse.winsInWindow}</span>
              </>
            }
            sub={`Wins in a ${p.bestStretch.windowGames}-game window`}
          />
        </div>
        {p.consistencyStdDev != null && (
          <p className="text-xs text-faint">
            Consistency (σ across 5-game windows): {p.consistencyStdDev.toFixed(3)}. Lower means steadier results.
          </p>
        )}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel aria-label="Champions" className="flex flex-col gap-3 p-5">
          <SectionTitle>Champions</SectionTitle>
          {!p.mostPlayedChampion && !p.bestChampion && !p.worstChampion ? (
            <p className="text-sm text-muted-foreground">No champion data yet.</p>
          ) : (
            <>
              {p.mostPlayedChampion && (
                <ChampionRow
                  label="Most played"
                  name={p.mostPlayedChampion.name}
                  championId={championIds[p.mostPlayedChampion.name]}
                  detail={`${p.mostPlayedChampion.games} games`}
                />
              )}
              {p.bestChampion && (
                <ChampionRow
                  label="Best"
                  name={p.bestChampion.name}
                  championId={championIds[p.bestChampion.name]}
                  detail={`${p.bestChampion.winrate.toFixed(0)}% over ${p.bestChampion.games} games`}
                  tone="text-win"
                />
              )}
              {p.worstChampion && (
                <ChampionRow
                  label="Worst"
                  name={p.worstChampion.name}
                  championId={championIds[p.worstChampion.name]}
                  detail={`${p.worstChampion.winrate.toFixed(0)}% over ${p.worstChampion.games} games`}
                  tone="text-loss"
                />
              )}
            </>
          )}
          {p.bestDuoPartner && (
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">
                Best duo:{" "}
                <Link href={`/players/${p.bestDuoPartner.partnerId}`} className="font-semibold text-foreground hover:underline">
                  {p.bestDuoPartner.gameName}
                </Link>
              </span>
              <span className="text-xs text-faint">
                <span className="text-win">{p.bestDuoPartner.winrate.toFixed(0)}%</span> over {p.bestDuoPartner.games} games
              </span>
            </div>
          )}
        </Panel>

        <Panel aria-label="Champion trust" className="flex flex-col gap-3 p-5">
          <SectionTitle>Champion trust</SectionTitle>
          {!hasTrust ? (
            <p className="text-sm text-muted-foreground">Not enough games for trust labels yet.</p>
          ) : (
            [
              { key: "Trusted", c: trust.trusted, className: "bg-win-soft text-win" },
              { key: "Fake comfort", c: trust.fakeComfort, className: "bg-loss-soft text-loss" },
              { key: "Coinflip", c: trust.coinflip, className: "bg-brand/15 text-brand" },
            ]
              .filter((t) => t.c)
              .map((t) => (
                <div key={t.key} className="flex min-h-10 items-center gap-3">
                  <ChampionIcon championId={championIds[t.c!.name]} championName={t.c!.name} className="size-9" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">{t.c!.name}</span>
                    <span className="text-xs text-faint">
                      {t.c!.games} games · {t.c!.winrate.toFixed(0)}%
                    </span>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                      t.className
                    )}
                  >
                    {t.key}
                  </span>
                </div>
              ))
          )}
        </Panel>
      </div>

      {p.highlights.length > 0 && (
        <section aria-label="Highlights" className="flex flex-col gap-3">
          <SectionTitle>Highlights</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {p.highlights.map((h) => (
              <Panel key={h.id} className="flex gap-3 p-4">
                <span aria-hidden className={cn("mt-1.5 inline-block size-2 shrink-0 rotate-45 rounded-[2px]", TONE_DOT[h.tone])} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-semibold">{h.title}</span>
                  <span className="text-sm text-muted-foreground">{h.detail}</span>
                </div>
              </Panel>
            ))}
          </div>
        </section>
      )}

      {p.topMoments.length > 0 && (
        <Panel aria-label="Top moments" className="flex flex-col gap-3 p-5">
          <SectionTitle>Top moments</SectionTitle>
          <ul className="flex flex-col">
            {p.topMoments.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-0.5 border-b border-[#1e2228] py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4"
              >
                <span className="shrink-0 font-display text-lg font-bold text-brand sm:w-48">{m.label}</span>
                <span className="text-sm text-muted-foreground">{m.description}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
