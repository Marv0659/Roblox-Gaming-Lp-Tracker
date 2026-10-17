/**
 * Champion name → Riot champion id, looked up from stored match participants.
 * Used for champion icons on pages whose data only carries the champion name.
 */
import { prisma } from "@/lib/db";

export async function getChampionIdsByName(names: Iterable<string>): Promise<Record<string, number>> {
  const unique = [...new Set(names)].filter(Boolean);
  if (unique.length === 0) return {};
  const rows = await prisma.matchParticipant.findMany({
    where: { championName: { in: unique }, championId: { gt: 0 } },
    distinct: ["championName"],
    select: { championName: true, championId: true },
  });
  const out: Record<string, number> = {};
  for (const r of rows) if (r.championName) out[r.championName] = r.championId;
  return out;
}
