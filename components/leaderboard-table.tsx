import type { LeaderboardEntry } from "@/lib/leaderboard";
import { LeaderboardRow } from "./leaderboard-row";
import { LeaderboardCard } from "./leaderboard-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Medal } from "lucide-react";
import { FLEX_QUEUE } from "@/lib/leaderboard";

interface Props {
  entries: LeaderboardEntry[];
  queue: string;
}

export function LeaderboardTable({ entries, queue }: Props) {
  const queueTitle = queue === FLEX_QUEUE ? "Flex 5v5 Leaderboard" : "Solo Queue Leaderboard";

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-border bg-muted/30 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex items-baseline gap-2">
          <Medal className="h-4 w-4 text-amber-400" aria-hidden />
          <h2 className="text-sm font-semibold tracking-wide">
            {queueTitle}
          </h2>
          <span className="text-xs text-muted-foreground">
            {entries.length} players
          </span>
        </div>
        <Badge variant="secondary" className="w-fit font-normal" title="This leaderboard only includes players you’ve added; it’s not the public ranked ladder.">
          Private lobby
        </Badge>
      </div>
      {/* Mobile: card list — no horizontal scroll, all info at a glance */}
      <div className="space-y-2 p-3 md:hidden">
        {entries.map((entry, index) => (
          <LeaderboardCard key={entry.id} entry={entry} index={index} />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto overflow-y-hidden -webkit-overflow-scrolling-touch md:block">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium" title="Position on this leaderboard (by rank then LP).">
                <span className="inline-flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5" aria-hidden />
                  Rank
                </span>
              </th>
              <th className="px-4 py-3 font-medium" title="Riot ID: in-game name and tag (e.g. Summoner#NA1).">Summoner</th>
              <th className="px-4 py-3 font-medium" title="Server/region where the account plays (e.g. EUW, NA).">Region</th>
              <th className="px-4 py-3 font-medium" title="Ranked tier and division (Iron IV up to Challenger).">Tier</th>
              <th className="px-4 py-3 font-medium" title="League Points: progress within the current tier (0–100 per division).">LP</th>
              <th className="px-4 py-3 font-medium" title="Wins and losses in this queue this season.">W / L</th>
              <th className="px-4 py-3 font-medium" title="Win rate % in this queue (wins ÷ total games).">Winrate</th>
              <th className="px-4 py-3 font-medium text-right" title="Open this player’s detailed profile and match history.">Profile</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <LeaderboardRow key={entry.id} entry={entry} index={index} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

