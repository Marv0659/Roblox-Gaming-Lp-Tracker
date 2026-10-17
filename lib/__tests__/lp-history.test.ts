import { describe, expect, it } from "vitest";
import { deriveSnapshotDeltas, lpChangeForMatch, type SnapshotLike } from "@/lib/lp-history";

const SOLO = "RANKED_SOLO_5x5";
const FLEX = "RANKED_FLEX_SR";

function snap(
  at: string,
  tier: string,
  rank: string,
  lp: number,
  wins: number,
  losses: number,
  queueType = SOLO
): SnapshotLike {
  return { createdAt: new Date(at), queueType, tier, rank, leaguePoints: lp, wins, losses };
}

describe("deriveSnapshotDeltas", () => {
  it("uses tier-aware LP across promotions", () => {
    const deltas = deriveSnapshotDeltas(
      [snap("2026-01-01T10:00Z", "GOLD", "I", 90, 10, 10), snap("2026-01-01T11:00Z", "PLATINUM", "IV", 15, 11, 10)],
      SOLO
    );
    expect(deltas).toHaveLength(1);
    expect(deltas[0].lpDelta).toBe(25);
  });
});

describe("lpChangeForMatch", () => {
  const snaps = [
    snap("2026-01-01T10:00Z", "GOLD", "I", 90, 10, 10),
    snap("2026-01-01T11:00Z", "PLATINUM", "IV", 15, 11, 10),
    snap("2026-01-01T15:00Z", "PLATINUM", "IV", 0, 12, 12),
    snap("2026-01-01T09:00Z", "SILVER", "I", 50, 3, 3, FLEX),
    snap("2026-01-01T12:00Z", "SILVER", "I", 30, 3, 4, FLEX),
  ];

  it("attributes the delta when exactly one game separates the snapshots", () => {
    expect(lpChangeForMatch({ gameStartAt: new Date("2026-01-01T10:20Z"), queueId: 420 }, snaps)).toBe(25);
  });

  it("returns null when several games happened between snapshots", () => {
    expect(lpChangeForMatch({ gameStartAt: new Date("2026-01-01T13:00Z"), queueId: 420 }, snaps)).toBeNull();
  });

  it("uses the snapshots of the match queue", () => {
    expect(lpChangeForMatch({ gameStartAt: new Date("2026-01-01T10:20Z"), queueId: 440 }, snaps)).toBe(-20);
  });

  it("returns null without a bracketing pair or for unknown queues", () => {
    expect(lpChangeForMatch({ gameStartAt: new Date("2026-01-01T16:00Z"), queueId: 420 }, snaps)).toBeNull();
    expect(lpChangeForMatch({ gameStartAt: new Date("2026-01-01T10:20Z"), queueId: 450 }, snaps)).toBeNull();
  });
});
