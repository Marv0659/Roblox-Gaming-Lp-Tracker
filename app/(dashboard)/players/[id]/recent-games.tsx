"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChampionIcon, Panel, SectionTitle } from "@/components/lol";
import { ESTIMATED_LP_LOSS, ESTIMATED_LP_WIN } from "@/lib/leaderboard-constants";
import { cn, formatShortDate } from "@/lib/utils";

export type RecentGame = {
  id: string;
  matchDbId: string;
  queueId: number;
  championId: number;
  championName: string | null;
  teamPosition: string | null;
  earlySurrender: boolean;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  cs: number;
  damageDealt: number;
  visionScore: number;
  gameStartAt: Date;
  gameDuration: number;
  lpChange: number | null;
};

const ROLE: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "Bot",
  UTILITY: "Support",
};

const PAGE = 8;
type Filter = "all" | "solo" | "flex";

export function RecentGames({ games }: { games: RecentGame[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(
    () =>
      games.filter((g) => (filter === "solo" ? g.queueId === 420 : filter === "flex" ? g.queueId === 440 : true)),
    [games, filter]
  );
  const shown = expanded ? filtered : filtered.slice(0, PAGE);

  return (
    <Panel aria-label="Recent games" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <SectionTitle>Recent games</SectionTitle>
        <div role="group" aria-label="Queue filter" className="flex gap-1 text-[13px]">
          {(["all", "solo", "flex"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => {
                setFilter(f);
                setExpanded(false);
              }}
              className={cn(
                "min-h-8 rounded-[7px] px-3 capitalize",
                filter === f ? "bg-input text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          {filter === "all" ? "No games stored yet. Sync to fetch recent ranked games." : `No ${filter} games stored yet.`}
        </p>
      ) : (
        <ul>
          {shown.map((g) => {
            const remake = g.earlySurrender || g.gameDuration < 210;
            const mins = Math.max(1, g.gameDuration / 60);
            const kda = (g.kills + g.assists) / Math.max(1, g.deaths);
            const lp = remake ? null : g.lpChange;
            const estimate = g.win ? ESTIMATED_LP_WIN : ESTIMATED_LP_LOSS;
            return (
              <li key={g.id} className="border-b border-[#1e2228] last:border-b-0">
                <Link
                  href={`/matches/${g.matchDbId}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60 sm:gap-4 sm:px-5"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-11 w-1 shrink-0 rounded-full",
                      remake ? "bg-input" : g.win ? "bg-win-solid" : "bg-loss-solid"
                    )}
                  />
                  <ChampionIcon championId={g.championId} championName={g.championName} className="size-11" />
                  <div className="flex min-w-0 flex-[1_1_120px] flex-col gap-0.5">
                    <span className="truncate text-[15px] font-semibold">
                      {g.championName ?? "—"}
                      <span className="ml-2 font-display text-base font-semibold tabular-nums text-muted-foreground sm:hidden">
                        {g.kills}/{g.deaths}/{g.assists}
                      </span>
                    </span>
                    <span className="truncate text-xs text-faint">
                      {g.queueId === 440 ? "Flex" : "Solo"}
                      {g.teamPosition && ROLE[g.teamPosition] ? ` · ${ROLE[g.teamPosition]}` : ""} ·{" "}
                      {Math.round(mins)} min · {formatShortDate(g.gameStartAt)}
                    </span>
                  </div>
                  <div className="hidden w-24 shrink-0 flex-col gap-0.5 sm:flex">
                    <span className="font-display text-[19px] font-semibold tabular-nums">
                      {g.kills} / {g.deaths} / {g.assists}
                    </span>
                    <span className="text-xs text-faint">{kda.toFixed(2)} KDA</span>
                  </div>
                  <div className="hidden w-40 shrink-0 flex-col gap-0.5 text-[13px] text-muted-foreground md:flex">
                    <span>
                      {g.cs} CS · {(g.cs / mins).toFixed(1)}/min
                    </span>
                    <span>
                      {(g.damageDealt / 1000).toFixed(1)}k dmg · {g.visionScore} vision
                    </span>
                  </div>
                  <div className="ml-auto flex w-16 shrink-0 flex-col gap-0.5 text-right">
                    <span
                      className={cn(
                        "text-sm font-bold",
                        remake ? "text-faint" : g.win ? "text-win" : "text-loss"
                      )}
                    >
                      {remake ? "Remake" : g.win ? "Win" : "Loss"}
                    </span>
                    {!remake &&
                      (lp != null ? (
                        <span className="text-xs font-semibold tabular-nums" title="From rank snapshots">
                          {lp > 0 ? "+" : ""}
                          {lp} LP
                        </span>
                      ) : (
                        <span
                          className="text-xs text-faint"
                          title="Estimated — several games happened between rank snapshots"
                        >
                          ~{estimate > 0 ? "+" : "−"}
                          {Math.abs(estimate)} est.
                        </span>
                      ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > PAGE && (
        <div className="px-5 py-3.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="min-h-10 rounded-lg border border-input px-4 text-sm hover:bg-surface-2"
          >
            {expanded ? "Show fewer" : `Show ${filtered.length - PAGE} more`}
          </button>
        </div>
      )}
    </Panel>
  );
}
