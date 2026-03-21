import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  type RankedWrappedBundle,
  type PlayerRankedWrapped,
  type GroupAward,
} from "@/lib/ranked-wrapped";
import {
  ArrowRight,
  Flame,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

function PlayerLink({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/players/${id}`}
      className="font-medium text-sky-400 hover:text-sky-300 hover:underline"
    >
      {children}
    </Link>
  );
}

function AwardTone({ tone }: { tone: "good" | "bad" | "neutral" }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        tone === "good" && "bg-emerald-500",
        tone === "bad" && "bg-rose-500",
        tone === "neutral" && "bg-zinc-500"
      )}
    />
  );
}

function StatGrid({
  items,
}: {
  items: { label: string; value: string; sub?: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border border-border/80 bg-muted/20 px-4 py-3"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {it.label}
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {it.value}
          </p>
          {it.sub && (
            <p className="mt-0.5 text-xs text-muted-foreground">{it.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function RankedWrappedShell({
  bundle,
  selectedPlayerId,
}: {
  bundle: RankedWrappedBundle;
  selectedPlayerId?: string;
}) {
  const { group, players } = bundle;
  const selected =
    selectedPlayerId &&
    players.find((p) => p.playerId === selectedPlayerId);

  return (
    <div className="relative p-4 sm:p-6 md:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-48 max-w-5xl bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.12),_transparent_55%),radial-gradient(ellipse_at_top,_rgba(168,85,247,0.1),_transparent_50%)] blur-2xl" />

      {/* Nav */}
      <div className="mb-8 flex flex-col gap-4 border-b border-border/60 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-8 w-8 text-amber-400" aria-hidden />
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ranked Wrapped
            </h1>
            <p className="text-sm text-muted-foreground">
              {group.scope.label} · {group.squadSize} tracked ·{" "}
              {group.totalRankedGames} ranked games in view
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/ranked-wrapped"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              !selectedPlayerId
                ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                : "border-border/80 bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Squad
          </Link>
          {players.map((p) => (
            <Link
              key={p.playerId}
              href={`/ranked-wrapped?player=${encodeURIComponent(p.playerId)}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                selectedPlayerId === p.playerId
                  ? "border-violet-500/50 bg-violet-500/10 text-violet-200"
                  : "border-border/80 bg-muted/30 text-muted-foreground hover:bg-muted/50"
              )}
            >
              {p.gameName}
            </Link>
          ))}
        </div>
      </div>

      {selected ? (
        <PlayerWrappedBody p={selected} />
      ) : (
        <GroupWrappedBody group={group} />
      )}
    </div>
  );
}

function GroupWrappedBody({
  group,
}: {
  group: RankedWrappedBundle["group"];
}) {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-violet-500/5 p-6 sm:p-8">
        <div className="absolute right-4 top-4 opacity-20">
          <Trophy className="h-24 w-24 text-amber-400" />
        </div>
        <Badge variant="outline" className="mb-3 border-amber-500/40 text-amber-200">
          Squad story
        </Badge>
        <h2 className="max-w-2xl text-xl font-semibold leading-snug sm:text-2xl">
          {group.narrative.headline}
        </h2>
        <ul className="mt-4 max-w-2xl space-y-2 text-sm text-muted-foreground">
          {group.narrative.lines.map((line, i) => (
            <li key={i} className="flex gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/80" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        {group.avgWinrate != null && (
          <p className="mt-6 text-sm text-muted-foreground">
            Blended squad winrate:{" "}
            <span className="font-semibold text-foreground">
              {group.avgWinrate.toFixed(1)}%
            </span>
          </p>
        )}
      </section>

      {group.duoHighlight && (
        <Card className="border-violet-500/25 bg-violet-500/5">
          <CardHeader className="pb-2">
            <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Duo highlight
            </h3>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-foreground">
              {group.duoHighlight.playerA}{" "}
              <span className="text-muted-foreground">&</span>{" "}
              {group.duoHighlight.playerB}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {group.duoHighlight.games} games together ·{" "}
              <span className="font-medium text-emerald-400">
                {group.duoHighlight.winrate.toFixed(0)}% WR
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Flame className="h-5 w-5 text-orange-400" />
          Awards
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {group.awards.map((a) => (
            <AwardCard key={a.id} award={a} />
          ))}
        </div>
      </section>
    </div>
  );
}

function AwardCard({ award }: { award: GroupAward }) {
  return (
    <Card className="border-border/80 bg-card/80 transition-colors hover:border-border">
      <CardHeader className="pb-2">
        <h4 className="font-semibold leading-tight">{award.title}</h4>
        <p className="text-xs text-muted-foreground">{award.subtitle}</p>
      </CardHeader>
      <CardContent>
        {award.winner ? (
          <>
            <PlayerLink id={award.winner.playerId}>
              {award.winner.gameName}#{award.winner.tagLine}
            </PlayerLink>
            {award.stat && (
              <p className="mt-2 text-sm font-medium tabular-nums text-foreground">
                {award.stat}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No data yet</p>
        )}
      </CardContent>
    </Card>
  );
}

function PlayerWrappedBody({ p }: { p: PlayerRankedWrapped }) {
  const lpTone =
    p.netLpSolo > 40 ? "text-emerald-400" : p.netLpSolo < -40 ? "text-rose-400" : "text-foreground";

  const coreStats = [
    {
      label: "Ranked games",
      value: String(p.rankedGamesPlayed),
      sub: "queues 420 / 440, remakes excluded",
    },
    {
      label: "Net LP (Solo/Duo)",
      value: `${p.netLpSolo >= 0 ? "+" : ""}${p.netLpSolo}`,
      sub: `Gross +${p.grossLpGained} / ${p.grossLpLost} from snapshot deltas`,
    },
    {
      label: "Overall winrate",
      value:
        p.overallWinrate != null ? `${p.overallWinrate.toFixed(1)}%` : "—",
    },
    {
      label: "Longest win / loss streak",
      value: `${p.longestWinStreak} / ${p.longestLossStreak}`,
    },
    {
      label: "LP (7d / 30d)",
      value: `${p.derived.lpGained7d >= 0 ? "+" : ""}${p.derived.lpGained7d} / ${
        p.derived.lpGained30d >= 0 ? "+" : ""
      }${p.derived.lpGained30d}`,
    },
    {
      label: "Current streak",
      value: `${p.derived.currentWinStreak}W · ${p.derived.currentLossStreak}L`,
      sub: "from most recent games",
    },
  ];

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-background to-sky-500/5 p-6 sm:p-8">
        <Badge variant="outline" className="mb-3 border-violet-400/40 text-violet-200">
          {p.funTitle}
        </Badge>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {p.gameName}
          <span className="text-muted-foreground">#{p.tagLine}</span>
        </h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-foreground/90">
          {p.narrative.headline}
        </p>
        <ul className="mt-4 max-w-3xl space-y-2 text-sm text-muted-foreground">
          {p.narrative.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          {p.currentRank && (
            <div className="rounded-lg border border-border/80 bg-background/50 px-4 py-2">
              <p className="text-xs uppercase text-muted-foreground">Current</p>
              <p className="font-semibold">{p.currentRank.label}</p>
            </div>
          )}
          {p.highestRank && (
            <div className="rounded-lg border border-border/80 bg-background/50 px-4 py-2">
              <p className="text-xs uppercase text-muted-foreground">Peak</p>
              <p className="font-semibold">{p.highestRank.label}</p>
            </div>
          )}
          <div className={cn("rounded-lg border border-border/80 bg-background/50 px-4 py-2", lpTone)}>
            <p className="text-xs uppercase text-muted-foreground">Net LP</p>
            <p className="font-semibold tabular-nums">
              {p.netLpSolo >= 0 ? "+" : ""}
              {p.netLpSolo}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Season numbers</h3>
        <StatGrid items={coreStats} />
      </section>

      {p.peakToCurrentDrop && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-start gap-3 pt-6">
            <TrendingDown className="h-5 w-5 text-amber-400" />
            <div>
              <p className="font-medium">Peak → now</p>
              <p className="text-sm text-muted-foreground">
                {p.peakToCurrentDrop.peakLabel} → {p.peakToCurrentDrop.currentLabel}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold">Champions</h3>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {p.mostPlayedChampion && (
              <p>
                <span className="text-muted-foreground">Most played: </span>
                <span className="font-medium">{p.mostPlayedChampion.name}</span>{" "}
                ({p.mostPlayedChampion.games} games)
              </p>
            )}
            {p.bestChampion && (
              <p>
                <span className="text-muted-foreground">Best WR: </span>
                <span className="font-medium text-emerald-400">
                  {p.bestChampion.name}
                </span>{" "}
                — {p.bestChampion.winrate.toFixed(0)}% over {p.bestChampion.games}{" "}
                games
              </p>
            )}
            {p.worstChampion && (
              <p>
                <span className="text-muted-foreground">Worst WR: </span>
                <span className="font-medium text-rose-300">
                  {p.worstChampion.name}
                </span>{" "}
                — {p.worstChampion.winrate.toFixed(0)}% over{" "}
                {p.worstChampion.games} games
              </p>
            )}
            {p.bestDuoPartner && (
              <p className="pt-2 border-t border-border/60">
                <span className="text-muted-foreground">Best duo: </span>
                <PlayerLink id={p.bestDuoPartner.partnerId}>
                  {p.bestDuoPartner.gameName}#{p.bestDuoPartner.tagLine}
                </PlayerLink>{" "}
                — {p.bestDuoPartner.winrate.toFixed(0)}% (
                {p.bestDuoPartner.games} games)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold">Champion trust</h3>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {p.championTrust.trusted && (
              <p>
                <Badge className="mr-2 bg-emerald-600/80">Trusted</Badge>
                {p.championTrust.trusted.name} (
                {p.championTrust.trusted.winrate.toFixed(0)}% WR)
              </p>
            )}
            {p.championTrust.fakeComfort && (
              <p>
                <Badge className="mr-2 bg-rose-600/80">Fake comfort</Badge>
                {p.championTrust.fakeComfort.name} (
                {p.championTrust.fakeComfort.winrate.toFixed(0)}% WR)
              </p>
            )}
            {p.championTrust.coinflip && (
              <p>
                <Badge variant="secondary" className="mr-2">
                  Coinflip
                </Badge>
                {p.championTrust.coinflip.name}
              </p>
            )}
            {!p.championTrust.trusted &&
              !p.championTrust.fakeComfort &&
              !p.championTrust.coinflip && (
                <p className="text-muted-foreground">
                  Not enough games for trust labels yet.
                </p>
              )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          Momentum
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <p className="text-xs uppercase text-muted-foreground">
                Best {p.bestStretch.windowGames}-game slice
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-400">
                {p.bestStretch.winsInWindow} wins
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <p className="text-xs uppercase text-muted-foreground">
                Worst {p.worstCollapse.windowGames}-game slice
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-rose-400">
                {p.worstCollapse.winsInWindow} wins
              </p>
            </CardContent>
          </Card>
        </div>
        {p.consistencyStdDev != null && (
          <p className="mt-3 text-xs text-muted-foreground">
            Rolling consistency (σ across 5-game windows):{" "}
            {p.consistencyStdDev.toFixed(3)} — lower = steadier results.
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Highlights</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {p.highlights.map((h) => (
            <div
              key={h.id}
              className="flex gap-3 rounded-xl border border-border/80 bg-muted/15 p-4"
            >
              <AwardTone tone={h.tone} />
              <div>
                <p className="font-medium">{h.title}</p>
                <p className="text-sm text-muted-foreground">{h.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {p.topMoments.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-semibold">Top moments</h3>
          <ul className="space-y-2">
            {p.topMoments.map((m) => (
              <li
                key={m.id}
                className="flex gap-3 rounded-lg border border-border/60 bg-muted/10 px-4 py-3"
              >
                <span className="font-medium text-amber-400">{m.label}</span>
                <span className="text-sm text-muted-foreground">
                  {m.description}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
