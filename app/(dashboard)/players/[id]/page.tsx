import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerDetail, SOLO_QUEUE } from "@/lib/leaderboard";
import { getRecentRankEventsForPlayer } from "@/lib/rank-events";
import { describeRankEvent } from "@/lib/rank-event-labels";
import { getPlayerBadges, getRoughPatchSummary, BADGE_TOOLTIPS } from "@/lib/player-badges";
import { getBeastestHolder } from "@/lib/beastest";
import type { ChampionTrustLabel } from "@/lib/champion-trust";
import { getQueueRecommendationForPlayer, type QueueRecommendationResult } from "@/lib/queue-recommendation";
import { tierColor } from "@/lib/tier-colors";
import { cn, formatShortDate } from "@/lib/utils";
import {
  ChampionIcon,
  Eyebrow,
  LpBar,
  Panel,
  prettyTier,
  SectionTitle,
  StatTile,
  TierEmblem,
} from "@/components/lol";
import { LpHistoryChart } from "@/components/lp-history-chart";
import { SyncButton } from "./sync-button";
import { ViewSwitcher } from "./view-switcher";
import { RecentGames } from "./recent-games";

export const dynamic = "force-dynamic";

const ROLE: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "Bot",
  UTILITY: "Support",
};

const TRUST: Record<ChampionTrustLabel, { label: string; className: string }> = {
  TRUSTED: { label: "Trusted", className: "bg-win-soft text-win" },
  POCKET_PICK: { label: "Pocket pick", className: "bg-[#b48cff]/18 text-[#c9aeff]" },
  COINFLIP: { label: "Coinflip", className: "bg-brand/15 text-brand" },
  FAKE_COMFORT_PICK: { label: "Fake comfort", className: "bg-loss-soft text-loss" },
  DO_NOT_ALLOW: { label: "Do not allow", className: "bg-loss-soft text-loss" },
  INSUFFICIENT_DATA: { label: "Too early", className: "bg-surface-2 text-muted-foreground" },
};

const VERDICT_TONE: Record<string, string> = {
  YES: "text-win",
  ONLY_WITH_SUPERVISION: "text-brand",
  ONLY_IF_NOT_LOCKING_THAT_CHAMP: "text-[#c9aeff]",
  NO: "text-loss",
  ABSOLUTELY_NOT: "text-loss",
};

function verdictText(q: QueueRecommendationResult): string {
  if (q.recommendationLabel === "ONLY_IF_NOT_LOCKING_THAT_CHAMP" && q.badChampionName) {
    return `Not on ${q.badChampionName}`;
  }
  return q.recommendationLabel.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function mainRole(positions: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const p of positions) if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!top || top[1] < Math.max(3, positions.length * 0.5)) return null;
  return ROLE[top[0]] ?? null;
}

function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${n}`;
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [player, milestones, beastestHolder] = await Promise.all([
    getPlayerDetail(id),
    getRecentRankEventsForPlayer(id, 6),
    getBeastestHolder(),
  ]);
  if (!player) notFound();

  const solo = player.currentRanks.soloDuo;
  const flex = player.currentRanks.flex;
  const badges = getPlayerBadges(player.funStats, player.id, { beastestHolderId: beastestHolder?.id ?? null });
  const roughPatch = getRoughPatchSummary(player.funStats);
  const verdict = getQueueRecommendationForPlayer(player);
  const role = mainRole(player.recentMatches.map((m) => m.teamPosition));

  const played = player.recentMatches.filter((m) => !(m.earlySurrender || m.gameDuration < 210));
  const record = (n: number) => {
    const slice = played.slice(0, n);
    const wins = slice.filter((m) => m.win).length;
    return { games: slice.length, wins, losses: slice.length - wins };
  };
  const last10 = record(10);
  const last20 = record(20);
  const { currentWinStreak, currentLossStreak, averageKda, lpGained30d } = player.funStats;
  const soloSnapshots = player.recentSnapshots.filter((s) => s.queueType === SOLO_QUEUE);
  const championIds = new Map(player.recentMatches.map((m) => [m.championName, m.championId]));

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <Link href="/dashboard" className="text-[13px] text-muted-foreground hover:text-foreground">
        ← Leaderboard
      </Link>

      <Panel aria-label="Profile" className="flex flex-wrap items-stretch gap-6 p-5 md:p-6">
        <div className="flex min-w-[240px] flex-[1_1_260px] flex-col justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-4xl font-bold leading-none break-words md:text-5xl">
              {player.gameName} <span className="font-semibold text-faint">#{player.tagLine}</span>
            </h1>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-surface-2 px-2.5 py-1 uppercase text-[#cdd2d9]">{player.region}</span>
              {role && <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[#cdd2d9]">{role} main</span>}
              {badges.map((b) => (
                <span
                  key={b}
                  title={BADGE_TOOLTIPS[b] ?? ""}
                  className={cn(
                    "rounded-full px-2.5 py-1",
                    b === "THE BEASTEST" ? "bg-brand font-bold text-[#15181d]" : "bg-brand/15 text-brand"
                  )}
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <SyncButton playerId={player.id} />
            <Link
              href={`/ranked-wrapped?player=${encodeURIComponent(id)}`}
              className="inline-flex min-h-11 items-center rounded-lg border border-input px-4 text-sm font-medium hover:bg-surface-2"
            >
              Ranked Wrapped
            </Link>
            <ViewSwitcher playerId={player.id} />
          </div>
        </div>

        <div className="flex min-w-[260px] flex-[1_1_280px] items-center gap-5 rounded-xl bg-surface-2 p-4 md:p-5">
          <TierEmblem tier={solo?.tier} size={60} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Eyebrow>Solo / Duo</Eyebrow>
            {solo ? (
              <>
                <div className="font-display text-3xl font-bold leading-none">
                  <span className={tierColor(solo.tier)}>{prettyTier(solo.tier, solo.rank)}</span> {solo.leaguePoints} LP
                </div>
                <LpBar tier={solo.tier} lp={solo.leaguePoints} className="h-1.5" />
                <div className="text-[13px] text-muted-foreground">
                  {solo.wins}W {solo.losses}L{solo.winrate != null ? ` · ${solo.winrate.toFixed(1)}%` : ""}
                </div>
              </>
            ) : (
              <div className="font-display text-2xl font-bold text-muted-foreground">Unranked</div>
            )}
          </div>
        </div>

        <div className="flex min-w-[200px] flex-[1_1_200px] flex-col justify-center gap-1.5 rounded-xl bg-surface-2 p-4 md:p-5">
          <Eyebrow>Flex</Eyebrow>
          {flex ? (
            <>
              <div className="font-display text-2xl font-bold leading-none">
                <span className={tierColor(flex.tier)}>{prettyTier(flex.tier, flex.rank)}</span> {flex.leaguePoints} LP
              </div>
              <div className="text-[13px] text-muted-foreground">
                {flex.wins}W {flex.losses}L{flex.winrate != null ? ` · ${flex.winrate.toFixed(1)}%` : ""}
              </div>
            </>
          ) : (
            <div className="font-display text-2xl font-bold text-muted-foreground">Unranked</div>
          )}
        </div>
      </Panel>

      <section aria-label="Form" className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatTile
          label="Last 10"
          value={last10.games ? `${last10.wins}W ${last10.losses}L` : "—"}
          sub={last10.games ? `${Math.round((last10.wins / last10.games) * 100)}% win rate` : "No games yet"}
        />
        <StatTile
          label="Last 20"
          value={last20.games ? `${last20.wins}W ${last20.losses}L` : "—"}
          sub={last20.games ? `${Math.round((last20.wins / last20.games) * 100)}% win rate` : "No games yet"}
        />
        <StatTile
          label="Streak"
          value={
            currentWinStreak > 0 ? (
              <span className="text-win">W{currentWinStreak}</span>
            ) : currentLossStreak > 0 ? (
              <span className="text-loss">L{currentLossStreak}</span>
            ) : (
              "—"
            )
          }
          sub={
            currentWinStreak > 1
              ? `${currentWinStreak} wins in a row`
              : currentLossStreak > 1
                ? `${currentLossStreak} losses in a row`
                : "No streak"
          }
        />
        <StatTile
          label="Avg KDA"
          value={averageKda != null ? averageKda.toFixed(2) : "—"}
          sub={`Last ${player.recentMatches.length} games`}
        />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          {soloSnapshots.length >= 2 && (
            <Panel aria-label="LP history" className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <SectionTitle>LP history · solo</SectionTitle>
                <span className="text-xs text-faint">
                  {signed(lpGained30d)} LP in 30 days · steps are rank snapshots
                </span>
              </div>
              <LpHistoryChart snapshots={soloSnapshots} />
            </Panel>
          )}

          <RecentGames games={player.recentMatches} />
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Panel aria-label="Queue verdict" className="flex flex-col gap-2.5 border-[#2e4a66] p-5">
            <Eyebrow>Should you queue?</Eyebrow>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                className={cn(
                  "font-display text-4xl font-bold uppercase leading-none",
                  VERDICT_TONE[verdict.recommendationLabel] ?? "text-foreground"
                )}
              >
                {verdictText(verdict)}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(verdict.recommendationScore)} / 100 · {Math.round(verdict.confidence * 100)}% confident
              </span>
            </div>
            <p className="text-sm text-[#cdd2d9]">{verdict.shortReason}</p>
            {(verdict.championWarning || verdict.queueCurfewWarning) && (
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                {verdict.championWarning && <li>{verdict.championWarning}</li>}
                {verdict.queueCurfewWarning && <li>{verdict.queueCurfewWarning}</li>}
              </ul>
            )}
          </Panel>

          {roughPatch && (
            <Panel aria-label="Rough patch" className="flex flex-col gap-2 border-loss-solid/40 p-5">
              <Eyebrow className="text-loss">Rough patch</Eyebrow>
              <p className="text-sm text-[#cdd2d9]">{roughPatch.summary}</p>
              <p className="text-xs text-faint">Data-driven, not salt.</p>
            </Panel>
          )}

          <Panel aria-label="Champion trust" className="flex flex-col gap-3 p-5">
            <SectionTitle>Champion trust</SectionTitle>
            {player.championTrust.length === 0 ? (
              <p className="text-sm text-muted-foreground">Needs 3+ games on a champion.</p>
            ) : (
              player.championTrust.slice(0, 6).map((c) => {
                const t = TRUST[c.trustLabel];
                return (
                  <div key={c.championName} className="flex min-h-10 items-center gap-3" title={c.trustReason}>
                    <ChampionIcon
                      championId={championIds.get(c.championName)}
                      championName={c.championName}
                      className="size-9"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold">{c.championName}</span>
                      <span className="text-xs text-faint">
                        {c.games} games · {Math.round(c.winrate)}%
                      </span>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                        t.className
                      )}
                    >
                      {t.label}
                    </span>
                  </div>
                );
              })
            )}
          </Panel>

          <Panel aria-label="Milestones" className="flex flex-col gap-3 p-5">
            <SectionTitle>Milestones</SectionTitle>
            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No milestones yet.</p>
            ) : (
              milestones.map((m) => {
                const c = describeRankEvent(m);
                return (
                  <div key={m.id} className="flex justify-between gap-3 text-sm">
                    <span className="flex items-baseline gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          "inline-block size-2 shrink-0 rotate-45 rounded-[2px]",
                          c.tone === "up" && "bg-win-solid",
                          c.tone === "down" && "bg-loss-solid",
                          c.tone === "peak" && "bg-brand"
                        )}
                      />
                      <span className="first-letter:uppercase">{c.text}</span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-faint">{formatShortDate(m.createdAt)}</span>
                  </div>
                );
              })
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
