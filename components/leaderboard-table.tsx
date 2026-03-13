import type { LeaderboardEntry } from "@/lib/leaderboard";
import { LeaderboardRow } from "./leaderboard-row";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  entries: LeaderboardEntry[];
}

export function LeaderboardTable({ entries }: Props) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold tracking-wide">
            Solo Queue Leaderboard
          </h2>
          <span className="text-xs text-muted-foreground">
            {entries.length} players
          </span>
        </div>
        <Badge variant="secondary" className="font-normal">
          Private lobby
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Summoner</th>
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">LP</th>
              <th className="px-4 py-3 font-medium">W / L</th>
              <th className="px-4 py-3 font-medium">Winrate</th>
              <th className="px-4 py-3 font-medium text-right">Profile</th>
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

