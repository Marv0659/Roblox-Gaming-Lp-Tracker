/**
 * Pure helpers for match sync (no Prisma / Riot calls) so they can be unit tested.
 */

/**
 * Decides whether a stored match still needs its details fetched from Riot.
 * - Rows synced before `participantPuuids` existed: skip once this player has a row
 *   (other tracked players backfill it from their own sync).
 * - Newer rows: skip when every tracked player in the match already has a row.
 */
export function storedMatchIsComplete(
  stored: { participantPuuids: string[]; participantIds: string[] },
  trackedPlayerId: string,
  puuidToId: Map<string, string>
): boolean {
  const have = new Set(stored.participantIds);
  if (stored.participantPuuids.length === 0) return have.has(trackedPlayerId);
  return stored.participantPuuids.every((puuid) => {
    const id = puuidToId.get(puuid);
    return id == null || have.has(id);
  });
}
