import { cn } from "@/lib/utils";

const RANK_BADGE_BY_TIER: Record<string, string> = {
  IRON: "emblem-iron.png",
  BRONZE: "emblem-bronze.png",
  SILVER: "emblem-silver.png",
  GOLD: "emblem-gold.png",
  PLATINUM: "emblem-platinum.png",
  EMERALD: "emblem-emerald.png",
  DIAMOND: "emblem-diamond.png",
  MASTER: "emblem-master.png",
  GRANDMASTER: "emblem-grandmaster.png",
  CHALLENGER: "emblem-challenger.png",
};

function getRankBadgeUrl(tier: string): string {
  const normalized = tier.toUpperCase();
  const file = RANK_BADGE_BY_TIER[normalized] ?? RANK_BADGE_BY_TIER.IRON;
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/${file}`;
}

interface RankBadgeProps {
  tier: string;
  className?: string;
}

export function RankBadge({ tier, className }: RankBadgeProps) {
  return (
    <img
      src={getRankBadgeUrl(tier)}
      alt={`${tier} rank emblem`}
      className={cn("h-24 w-24 shrink-0 scale-110 object-contain", className)}
      loading="lazy"
      decoding="async"
    />
  );
}
