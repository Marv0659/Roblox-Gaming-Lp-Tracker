/** Tailwind text color class for ranked tier (leaderboard, profile, etc.). */
export function tierColor(tier: string): string {
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
