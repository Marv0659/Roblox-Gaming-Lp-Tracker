/** Tailwind text color class for ranked tier (leaderboard, profile, etc.). */
export function tierColor(tier: string): string {
  const colors: Record<string, string> = {
    IRON: "text-[#b5b5b5]",
    BRONZE: "text-[#d9a276]",
    SILVER: "text-[#cdd4dd]",
    GOLD: "text-[#f0cf7e]",
    PLATINUM: "text-[#8edde2]",
    EMERALD: "text-[#7fe0a6]",
    DIAMOND: "text-[#afc0ff]",
    MASTER: "text-[#d2a8ff]",
    GRANDMASTER: "text-[#ff9a9a]",
    CHALLENGER: "text-[#f4c874]",
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

const TIER_HEX: Record<string, string> = {
  IRON: "#8c8c8c",
  BRONZE: "#b87333",
  SILVER: "#a9b4c2",
  GOLD: "#e3b341",
  PLATINUM: "#3fc1c9",
  EMERALD: "#2ecc71",
  DIAMOND: "#6c8cff",
  MASTER: "#b06cff",
  GRANDMASTER: "#ff5c5c",
  CHALLENGER: "#f4c874",
};

/** Solid tier colour (bars, chart lines). */
export function tierHex(tier: string): string {
  return TIER_HEX[tier] ?? "#7d8590";
}
