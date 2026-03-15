import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function tierColor(tier: string): string {
  const colors: Record<string, string> = {
    IRON: "text-zinc-500",
    BRONZE: "text-amber-700",
    SILVER: "text-zinc-300",
    GOLD: "text-yellow-500",
    PLATINUM: "text-sky-400",
    EMERALD: "text-emerald-500",
    DIAMOND: "text-cyan-400",
    MASTER: "text-purple-400",
    GRANDMASTER: "text-red-400",
    CHALLENGER: "text-amber-400",
  };
  return colors[tier] ?? "text-muted-foreground";
}

interface Props {
  entry: LeaderboardEntry;
  index: number;
}

export function LeaderboardRow({ entry, index }: Props) {
  return (
    <tr className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30">
      <td className="px-4 py-3 text-xs font-medium text-muted-foreground">
        #{index + 1}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">
            {entry.gameName}
            <span className="font-normal text-muted-foreground">#{entry.tagLine}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            Riot ID • {entry.region.toUpperCase()}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs uppercase text-muted-foreground" title="Server/region (e.g. EUW, NA).">
        {entry.region}
      </td>
      <td className={cn("px-4 py-3 text-sm font-semibold", tierColor(entry.tier))} title="Ranked tier and division (I–IV; Master+ has no division).">
        {entry.tier}{" "}
        <span className="font-normal text-muted-foreground">{entry.rank || ""}</span>
      </td>
      <td className="px-4 py-3 text-sm" title="League Points: 0–100 per division; resets when you promote.">
        {entry.leaguePoints}
        <span className="ml-1 text-xs text-muted-foreground">LP</span>
      </td>
      <td className="px-4 py-3 text-sm" title="Wins / losses in this queue this season.">
        <span className="font-medium text-emerald-500">{entry.wins}</span>
        <span className="mx-1 text-muted-foreground">/</span>
        <span className="font-medium text-destructive">{entry.losses}</span>
      </td>
      <td className="px-4 py-3 text-sm" title="Win rate % (wins ÷ total games).">
        {entry.winrate != null ? (
          <>
            {entry.winrate.toFixed(1)}
            <span className="ml-1 text-xs text-muted-foreground">WR</span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right text-sm">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/players/${entry.id}`}>View profile</Link>
        </Button>
      </td>
    </tr>
  );
}

