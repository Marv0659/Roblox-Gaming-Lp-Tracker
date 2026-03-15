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
        <Badge variant="secondary" className="font-normal" title="This leaderboard only includes players you’ve added; it’s not the public ranked ladder.">
          Private lobby
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium" title="Position on this leaderboard (by rank then LP).">Rank</th>
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

