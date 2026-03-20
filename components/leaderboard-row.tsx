import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { tierColor, tierGlowClass } from "@/lib/tier-colors";
import { Button } from "@/components/ui/button";
import { RankBadge } from "@/components/rank-badge";
import { cn } from "@/lib/utils";

interface Props {
  entry: LeaderboardEntry;
  index: number;
}

function rankToDivision(rank?: string | null): string {
  switch ((rank ?? "").toUpperCase()) {
    case "I":
      return "1";
    case "II":
      return "2";
    case "III":
      return "3";
    case "IV":
      return "4";
    default:
      return "";
  }
}

export function LeaderboardRow({ entry, index }: Props) {
  const glow = tierGlowClass(entry.tier);
  const division = rankToDivision(entry.rank);
  return (
    <tr className="relative border-b border-border transition-colors last:border-b-0 hover:bg-muted/30">
      <td className="px-2 py-2 align-middle text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
        {/* Decorative tier glow */}
        {glow && (
          <div
            className={cn(
              "pointer-events-none absolute -left-6 top-1/2 h-20 w-32 -translate-y-1/2 rounded-full blur-2xl",
              glow
            )}
          />
        )}
        #{index + 1}
      </td>
      <td className="px-2 py-2 align-middle sm:px-4 sm:py-3">
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
      <td className="px-2 py-2 align-middle text-xs uppercase text-muted-foreground sm:px-4 sm:py-3" title="Server/region (e.g. EUW, NA).">
        {entry.region}
      </td>
      <td
        className={cn("px-2 py-0 align-middle text-sm font-semibold sm:px-4 sm:py-0", tierColor(entry.tier))}
        title="Ranked tier and division (I–IV; Master+ has no division)."
      >
        <div className="my-[-18px] flex items-center gap-0">
          <RankBadge tier={entry.tier} className="h-40 w-40" />
          <span className="-ml-3 text-base font-semibold">
            {entry.tier}
            {division ? ` ${division}` : ""}
          </span>
        </div>
      </td>
      <td className="px-2 py-2 align-middle text-sm sm:px-4 sm:py-3" title="League Points: 0–100 per division; resets when you promote.">
        {entry.leaguePoints}
        <span className="ml-1 text-xs text-muted-foreground">LP</span>
      </td>
      <td className="px-2 py-2 align-middle text-sm sm:px-4 sm:py-3" title="Wins / losses in this queue this season.">
        <span className="font-medium text-emerald-500">{entry.wins}</span>
        <span className="mx-1 text-muted-foreground">/</span>
        <span className="font-medium text-destructive">{entry.losses}</span>
      </td>
      <td className="px-2 py-2 align-middle text-sm sm:px-4 sm:py-3" title="Win rate % (wins ÷ total games).">
        {entry.winrate != null ? (
          <span
            className={cn(
              "font-medium",
              entry.winrate >= 55
                ? "text-emerald-500"
                : entry.winrate < 45
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {entry.winrate.toFixed(1)}
            <span className="ml-1 text-xs opacity-70">WR</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-2 py-2 align-middle text-right text-sm sm:px-4 sm:py-3">
        <Button variant="outline" size="sm" asChild className="whitespace-nowrap">
          <Link href={`/players/${entry.id}`}>View profile</Link>
        </Button>
      </td>
    </tr>
  );
}

