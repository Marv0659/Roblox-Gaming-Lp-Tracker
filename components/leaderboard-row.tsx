import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { tierColor } from "@/lib/tier-colors";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  entry: LeaderboardEntry;
  index: number;
}

export function LeaderboardRow({ entry, index }: Props) {
  return (
    <tr className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30">
      <td className="px-2 py-2 text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
        #{index + 1}
      </td>
      <td className="px-2 py-2 sm:px-4 sm:py-3">
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold truncate max-w-[120px] sm:max-w-none">
            {entry.gameName}
            <span className="font-normal text-muted-foreground">#{entry.tagLine}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            Riot ID • {entry.region.toUpperCase()}
          </span>
        </div>
      </td>
      <td className="px-2 py-2 text-xs uppercase text-muted-foreground sm:px-4 sm:py-3" title="Server/region (e.g. EUW, NA).">
        {entry.region}
      </td>
      <td className={cn("px-2 py-2 text-sm font-semibold sm:px-4 sm:py-3", tierColor(entry.tier))} title="Ranked tier and division (I–IV; Master+ has no division).">
        {entry.tier}{" "}
        <span className="font-normal text-muted-foreground">{entry.rank || ""}</span>
      </td>
      <td className="px-2 py-2 text-sm sm:px-4 sm:py-3" title="League Points: 0–100 per division; resets when you promote.">
        {entry.leaguePoints}
        <span className="ml-1 text-xs text-muted-foreground">LP</span>
      </td>
      <td className="px-2 py-2 text-sm sm:px-4 sm:py-3" title="Wins / losses in this queue this season.">
        <span className="font-medium text-emerald-500">{entry.wins}</span>
        <span className="mx-1 text-muted-foreground">/</span>
        <span className="font-medium text-destructive">{entry.losses}</span>
      </td>
      <td className="px-2 py-2 text-sm sm:px-4 sm:py-3" title="Win rate % (wins ÷ total games).">
        {entry.winrate != null ? (
          <>
            {entry.winrate.toFixed(1)}
            <span className="ml-1 text-xs text-muted-foreground">WR</span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-2 py-2 text-right text-sm sm:px-4 sm:py-3">
        <Button variant="outline" size="sm" asChild className="whitespace-nowrap">
          <Link href={`/players/${entry.id}`}>View profile</Link>
        </Button>
      </td>
    </tr>
  );
}

