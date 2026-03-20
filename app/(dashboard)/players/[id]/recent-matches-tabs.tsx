"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDate } from "@/lib/utils";

const ESTIMATED_LP_WIN = 24;
const ESTIMATED_LP_LOSS = -18;

type RecentMatch = {
  id: string;
  matchDbId: string;
  queueId: number;
  championName: string | null;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  cs: number;
  gold: number;
  damageDealt: number;
  gameStartAt: Date;
  gameDuration: number;
  lpChange: number | null;
};

function queueLabel(queueId: number): string {
  if (queueId === 440) return "Flex";
  if (queueId === 420) return "Solo/Duo";
  return `Q${queueId}`;
}

export function RecentMatchesTabs({ matches }: { matches: RecentMatch[] }) {
  const [tab, setTab] = useState<"all" | "flex">("all");

  const displayed = useMemo(() => {
    if (tab === "flex") return matches.filter((m) => m.queueId === 440);
    return matches;
  }, [matches, tab]);

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            tab === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setTab("flex")}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            tab === "flex"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Flex
        </button>
      </div>

      {displayed.length === 0 ? (
        <p className="text-muted-foreground">
          {tab === "flex"
            ? "No stored Flex games for this player yet."
            : "No matches stored. Sync to fetch recent ranked games."}
        </p>
      ) : (
        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2 pr-2 sm:pr-4">Queue</th>
                <th className="pb-2 pr-2 sm:pr-4">Champion</th>
                <th className="pb-2 pr-2 sm:pr-4">K/D/A</th>
                <th className="pb-2 pr-2 sm:pr-4">Result</th>
                <th className="pb-2 pr-2 sm:pr-4">LP</th>
                <th className="pb-2 pr-2 sm:pr-4">CS</th>
                <th className="pb-2 pr-2 sm:pr-4">Gold</th>
                <th className="pb-2 pr-2 sm:pr-4">Damage</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((m) => {
                const remake = m.gameDuration < 210;
                const estimated = m.win ? ESTIMATED_LP_WIN : ESTIMATED_LP_LOSS;
                const lp = remake ? 0 : (m.lpChange ?? estimated);
                const isCalculated = m.lpChange !== null;
                const mins = Math.max(1, m.gameDuration / 60);

                return (
                  <tr
                    key={m.id}
                    className="border-b border-border text-muted-foreground last:border-b-0"
                  >
                    <td className="py-2 pr-2 sm:pr-4">{queueLabel(m.queueId)}</td>
                    <td className="py-2 pr-2 font-medium text-foreground sm:pr-4">
                      {m.championName ?? "—"}
                    </td>
                    <td className="py-2 pr-2 sm:pr-4">
                      {m.kills}/{m.deaths}/{m.assists}
                    </td>
                    <td className="py-2 pr-2 sm:pr-4">
                      {remake ? (
                        <span className="text-muted-foreground">Remake</span>
                      ) : (
                        <span className={m.win ? "text-emerald-500" : "text-destructive"}>
                          {m.win ? "Win" : "Loss"}
                        </span>
                      )}
                    </td>
                    <td
                      className="py-2 pr-2 sm:pr-4"
                      title={
                        isCalculated
                          ? "From rank snapshots."
                          : "Estimated (no snapshots bracketing this match)."
                      }
                    >
                      <span
                        className={
                          remake
                            ? "font-medium text-muted-foreground"
                            : lp >= 0
                            ? "font-medium text-emerald-500"
                            : "font-medium text-destructive"
                        }
                      >
                        {remake ? "±0" : `${lp >= 0 ? "+" : ""}${lp}`}
                      </span>
                    </td>
                    <td className="py-2 pr-2 sm:pr-4">
                      {m.cs}
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        ({(m.cs / mins).toFixed(1)})
                      </span>
                    </td>
                    <td className="py-2 pr-2 sm:pr-4">
                      {m.gold.toLocaleString()}
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        ({(m.gold / mins).toFixed(1)})
                      </span>
                    </td>
                    <td className="py-2 pr-2 sm:pr-4">
                      {m.damageDealt.toLocaleString()}
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        ({(m.damageDealt / mins).toFixed(1)})
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">
                      <Link
                        href={`/matches/${m.matchDbId}`}
                        className="text-primary hover:underline"
                      >
                        {formatDate(m.gameStartAt)}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

