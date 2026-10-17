import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchDetail } from "@/lib/leaderboard";
import { isRemake } from "@/lib/derived-stats";
import { formatDate, formatNumber, formatTime } from "@/lib/utils";
import { ChampionIcon, Eyebrow, Panel, ResultPill, SectionTitle, StatTile } from "@/components/lol";

export const dynamic = "force-dynamic";

function queueLabel(queueId: number): string {
  const map: Record<number, string> = {
    420: "Ranked Solo / Duo",
    440: "Ranked Flex",
    450: "ARAM",
  };
  return map[queueId] ?? `Queue ${queueId}`;
}

function kda(p: { kills: number; deaths: number; assists: number }): string {
  return ((p.kills + p.assists) / Math.max(1, p.deaths)).toFixed(2);
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatchDetail(id);
  if (!match) notFound();

  const minutes = match.gameDuration / 60;
  const duration = `${Math.floor(minutes)}:${(match.gameDuration % 60).toString().padStart(2, "0")}`;
  const remake = isRemake(match);
  const players = [...match.participants].sort((a, b) => Number(b.win) - Number(a.win));
  const wins = players.filter((p) => p.win).length;
  const outcome = remake
    ? { text: "Remake", className: "text-muted-foreground" }
    : wins === players.length
      ? { text: "Victory", className: "text-win" }
      : wins === 0
        ? { text: "Defeat", className: "text-loss" }
        : { text: "Split lobby", className: "text-brand" };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <Link href="/dashboard" className="text-[13px] text-muted-foreground hover:text-foreground">
        ← Leaderboard
      </Link>

      <header className="flex flex-col gap-1">
        <Eyebrow>{queueLabel(match.queueId)}</Eyebrow>
        <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-wide md:text-[44px]">
          <span className={outcome.className}>{outcome.text}</span>
          <span className="text-faint"> · {duration}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(match.gameStartAt)}, {formatTime(match.gameStartAt)} ·{" "}
          <span className="font-mono text-xs text-faint">{match.riotMatchId}</span>
        </p>
      </header>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile label="Tracked players" value={players.length} />
        <StatTile
          label="Squad K / D / A"
          value={`${players.reduce((s, p) => s + p.kills, 0)} / ${players.reduce((s, p) => s + p.deaths, 0)} / ${players.reduce((s, p) => s + p.assists, 0)}`}
        />
        <StatTile label="Squad damage" value={formatNumber(players.reduce((s, p) => s + p.damageDealt, 0))} />
        <StatTile label="Squad gold" value={formatNumber(players.reduce((s, p) => s + p.gold, 0))} />
      </section>

      <Panel aria-label="Tracked players in this match" className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <SectionTitle>Tracked players</SectionTitle>
        </div>
        <div className="hidden grid-cols-[minmax(0,1.6fr)_110px_repeat(4,minmax(70px,1fr))_80px] gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint lg:grid">
          <div>Player</div>
          <div>K / D / A</div>
          <div className="text-right">CS</div>
          <div className="text-right">Gold</div>
          <div className="text-right">Damage</div>
          <div className="text-right">Vision</div>
          <div className="text-right">Result</div>
        </div>
        <ul>
          {players.map((p) => (
            <li
              key={p.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-[#1e2228] px-4 py-3 last:border-b-0 lg:grid-cols-[minmax(0,1.6fr)_110px_repeat(4,minmax(70px,1fr))_80px] lg:gap-4 lg:px-5"
            >
              <div className="contents lg:flex lg:min-w-0 lg:items-center lg:gap-3">
                <ChampionIcon championId={p.championId} championName={p.championName} />
                <div className="flex min-w-0 flex-col">
                  <Link href={`/players/${p.id}`} className="truncate text-[15px] font-semibold hover:underline">
                    {p.gameName} <span className="font-medium text-faint">#{p.tagLine}</span>
                  </Link>
                  <span className="text-xs text-faint">
                    {p.championName ?? "—"}
                    <span className="lg:hidden">
                      {" "}
                      · {p.kills} / {p.deaths} / {p.assists}
                    </span>
                  </span>
                </div>
              </div>
              <div className="hidden flex-col lg:flex">
                <span className="font-display text-lg font-bold tabular-nums">
                  {p.kills} / {p.deaths} / {p.assists}
                </span>
                <span className="text-xs text-faint">{kda(p)} KDA</span>
              </div>
              <div className="col-span-3 col-start-1 row-start-2 grid grid-cols-4 gap-2 text-sm tabular-nums lg:contents">
                {[
                  { label: "CS", value: `${p.cs}`, sub: minutes > 0 ? `${(p.cs / minutes).toFixed(1)}/min` : undefined },
                  { label: "Gold", value: formatNumber(p.gold) },
                  { label: "Damage", value: formatNumber(p.damageDealt) },
                  { label: "Vision", value: `${p.visionScore}` },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col rounded-lg bg-surface-2 px-2.5 py-1.5 lg:items-end lg:bg-transparent lg:p-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint lg:hidden">{s.label}</span>
                    <span>{s.value}</span>
                    {s.sub && <span className="hidden text-xs text-faint lg:inline">{s.sub}</span>}
                  </div>
                ))}
              </div>
              <div className="col-start-3 row-start-1 justify-self-end lg:col-start-auto lg:row-start-auto">
                <ResultPill win={p.win} remake={remake} />
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
