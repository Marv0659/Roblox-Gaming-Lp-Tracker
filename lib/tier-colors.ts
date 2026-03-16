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

/** Tailwind bg color class (semi-transparent) used for decorative glow blobs per tier. */
export function tierGlowClass(tier: string): string {
  const glows: Record<string, string> = {
    IRON: "bg-zinc-500/10",
    BRONZE: "bg-amber-700/10",
    SILVER: "bg-zinc-300/10",
    GOLD: "bg-yellow-500/10",
    PLATINUM: "bg-sky-400/10",
    EMERALD: "bg-emerald-500/10",
    DIAMOND: "bg-cyan-400/10",
    MASTER: "bg-purple-400/15",
    GRANDMASTER: "bg-red-400/15",
    CHALLENGER: "bg-amber-400/20",
  };
  return glows[tier] ?? "";
}
