import Link from "next/link";
import { cn, formatDate, formatShortDate, formatTime } from "@/lib/utils";
import {
  getSessionRecap,
  type SessionMatchHighlight,
  type SessionMvpFraud,
  type SessionPlayerLp,
  type SessionRecapData,
  type SessionWindowPreset,
} from "@/lib/session-recap";
import {
  FLEX_QUEUE,
  QUEUE_LABEL_BY_TYPE,
  SOLO_QUEUE,
  type RankedQueueType,
} from "@/lib/leaderboard";
import { Eyebrow, Panel, ResultPill, SectionTitle, Segmented } from "@/components/lol";

export const dynamic = "force-dynamic";

type QueuePreset = "solo" | "flex";

const QUEUE_PRESET_TO_TYPE: Record<QueuePreset, RankedQueueType> = {
  solo: SOLO_QUEUE,
  flex: FLEX_QUEUE,
};

function parseQueuePreset(value?: string): QueuePreset {
  return value === "flex" ? "flex" : "solo";
}

function formatTimeRange(start: Date, end: Date): string {
  if (formatDate(start) === formatDate(end)) {
    return `${formatShortDate(start)} ${formatTime(start)} – ${formatTime(end)}`;
  }
  return `${formatShortDate(start)} ${formatTime(start)} – ${formatShortDate(end)} ${formatTime(end)}`;
}

function signedLp(n: number | null): string {
  if (n == null) return "— LP";
  return `${n > 0 ? "+" : ""}${n} LP`;
}

function PlayerName({ playerId, gameName, tagLine }: { playerId: string; gameName: string; tagLine: string }) {
  return (
    <Link href={`/players/${playerId}`} className="truncate text-[17px] font-semibold hover:underline">
      {gameName} <span className="font-medium text-faint">#{tagLine}</span>
    </Link>
  );
}

function LpCard({
  title,
  player,
  tone,
  empty,
}: {
  title: string;
  player: SessionPlayerLp | null;
  tone: string;
  empty: string;
}) {
  return (
    <Panel className="flex min-w-0 flex-col gap-2 p-5">
      <Eyebrow className={tone}>{title}</Eyebrow>
      {player ? (
        <>
          <PlayerName {...player} />
          <span className={cn("font-display text-3xl font-bold leading-none tabular-nums", tone)}>
            {signedLp(player.netLp)}
          </span>
          <span className="text-xs text-muted-foreground">
            {player.wins}W {player.losses}L · {player.gamesPlayed} games
          </span>
        </>
      ) : (
        <span className="font-display text-2xl font-semibold text-muted-foreground">{empty}</span>
      )}
    </Panel>
  );
}

function MatchCard({ title, match, tone }: { title: string; match: SessionMatchHighlight; tone: string }) {
  return (
    <Panel className="flex min-w-0 flex-col gap-2 p-5">
      <Eyebrow className={tone}>{title}</Eyebrow>
      <PlayerName {...match} />
      <Link href={`/matches/${match.matchId}`} className="flex items-center gap-3 hover:underline">
        <span className="font-display text-2xl font-bold leading-none tabular-nums">
          {match.kills} / {match.deaths} / {match.assists}
        </span>
        <ResultPill win={match.win} />
      </Link>
      <p className="text-sm text-[#cdd2d9]">
        {match.championName ?? "—"} · {match.reason}
      </p>
      <span className="text-xs text-faint">
        {formatShortDate(match.gameStartAt)}, {formatTime(match.gameStartAt)}
      </span>
    </Panel>
  );
}

function VerdictCard({ title, entry, tone, note }: { title: string; entry: SessionMvpFraud; tone: string; note?: string }) {
  return (
    <Panel className={cn("flex min-w-0 flex-col gap-2 p-5", tone === "text-loss" ? "border-loss-solid/40" : "border-brand/40")}>
      <Eyebrow className={tone}>{title}</Eyebrow>
      <PlayerName {...entry} />
      <p className="text-sm text-[#cdd2d9]">{entry.reason}</p>
      <span className="text-xs text-faint">
        {signedLp(entry.netLp)} · {entry.gamesPlayed} games
        {entry.winrate != null && ` · ${Math.round(entry.winrate)}%`}
        {note && ` · ${note}`}
      </span>
    </Panel>
  );
}

function SessionRecapContent({ recap }: { recap: SessionRecapData }) {
  const active = recap.playerLp
    .filter((p) => p.gamesPlayed > 0)
    .sort((a, b) => (b.netLp ?? -Infinity) - (a.netLp ?? -Infinity));

  if (active.length === 0) {
    return (
      <Panel className="border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
        No ranked games in this window. Sync and play to see a session recap.
      </Panel>
    );
  }

  const winner = recap.biggestWinner?.netLp != null && recap.biggestWinner.netLp > 0 ? recap.biggestWinner : null;
  const loser = recap.biggestLoser?.netLp != null && recap.biggestLoser.netLp < 0 ? recap.biggestLoser : null;

  return (
    <>
      <section aria-label="Highlights" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
        <LpCard title="Biggest LP gain" player={winner} tone="text-win" empty="Nobody climbed" />
        <LpCard title="Biggest LP loss" player={loser} tone="text-loss" empty="No bums yet" />
        {recap.sessionMvp && <VerdictCard title="Session MVP" entry={recap.sessionMvp} tone="text-brand" />}
        {recap.bestMatch && <MatchCard title="Best game" match={recap.bestMatch} tone="text-win" />}
        {recap.worstCollapse && <MatchCard title="Worst collapse" match={recap.worstCollapse} tone="text-loss" />}
        {recap.sessionFraud && (
          <VerdictCard title="Session fraud" entry={recap.sessionFraud} tone="text-loss" note="data-driven, not salt" />
        )}
      </section>

      <Panel aria-label="LP by player" className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <SectionTitle>LP by player</SectionTitle>
        </div>
        <ul>
          {active.map((p) => (
            <li
              key={p.playerId}
              className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-[#1e2228] px-5 py-2.5 last:border-b-0"
            >
              <Link href={`/players/${p.playerId}`} className="min-w-0 truncate text-sm font-semibold hover:underline">
                {p.gameName} <span className="font-medium text-faint">#{p.tagLine}</span>
              </Link>
              <span className="flex shrink-0 items-baseline gap-4">
                <span className="text-xs text-muted-foreground">
                  {p.wins}W {p.losses}L{p.winrate != null && ` · ${Math.round(p.winrate)}%`}
                </span>
                <span
                  className={cn(
                    "w-20 text-right font-display text-lg font-bold tabular-nums",
                    p.netLp == null ? "text-faint" : p.netLp > 0 ? "text-win" : p.netLp < 0 ? "text-loss" : "text-foreground"
                  )}
                >
                  {signedLp(p.netLp)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

export default async function SessionRecapPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; queue?: string }>;
}) {
  const params = await searchParams;
  const preset: SessionWindowPreset = params.window === "today" ? "today" : "last24h";
  const queuePreset = parseQueuePreset(params.queue);
  const queueType = QUEUE_PRESET_TO_TYPE[queuePreset];
  const recap = await getSessionRecap(preset, queueType);
  const timeRange = formatTimeRange(recap.window.start, recap.window.end);
  const href = (w: SessionWindowPreset, q: QueuePreset) => `/session-recap?window=${w}&queue=${q}`;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-wide md:text-[44px]">
            Tonight’s session
          </h1>
          <p className="text-sm text-muted-foreground">
            {preset === "today" ? "Since midnight" : "Last 24 hours"} · {timeRange} · {QUEUE_LABEL_BY_TYPE[queueType]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented
            label="Time window"
            options={[
              { label: "Last 24h", href: href("last24h", queuePreset), active: preset === "last24h" },
              { label: "Today", href: href("today", queuePreset), active: preset === "today" },
            ]}
          />
          <Segmented
            label="Queue"
            options={[
              { label: "Solo / Duo", href: href(preset, "solo"), active: queuePreset === "solo" },
              { label: "Flex", href: href(preset, "flex"), active: queuePreset === "flex" },
            ]}
          />
        </div>
      </header>

      <SessionRecapContent recap={recap} />
    </div>
  );
}
