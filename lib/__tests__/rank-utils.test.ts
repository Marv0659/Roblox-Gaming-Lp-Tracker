import { describe, expect, it } from "vitest";
import { rankToLadderLp, compareRanks, lpDiff, ladderLpLabel, prettyTier } from "@/lib/rank-utils";

describe("rankToLadderLp / lpDiff", () => {
  it("counts LP within a division", () => {
    expect(lpDiff({ tier: "GOLD", rank: "II", leaguePoints: 20 }, { tier: "GOLD", rank: "II", leaguePoints: 41 })).toBe(21);
  });

  it("is positive across a promotion", () => {
    expect(lpDiff({ tier: "GOLD", rank: "I", leaguePoints: 90 }, { tier: "PLATINUM", rank: "IV", leaguePoints: 15 })).toBe(25);
    expect(lpDiff({ tier: "SILVER", rank: "III", leaguePoints: 85 }, { tier: "SILVER", rank: "II", leaguePoints: 5 })).toBe(20);
  });

  it("is negative across a demotion", () => {
    expect(lpDiff({ tier: "EMERALD", rank: "IV", leaguePoints: 10 }, { tier: "PLATINUM", rank: "I", leaguePoints: 75 })).toBe(-35);
  });

  it("puts Master+ on one ladder above Diamond I", () => {
    expect(lpDiff({ tier: "DIAMOND", rank: "I", leaguePoints: 90 }, { tier: "MASTER", rank: "I", leaguePoints: 0 })).toBe(10);
    expect(rankToLadderLp({ tier: "GRANDMASTER", rank: "I", leaguePoints: 300 })).toBe(
      rankToLadderLp({ tier: "MASTER", rank: "I", leaguePoints: 300 })
    );
  });

  it("falls back to raw LP for unknown tiers", () => {
    expect(rankToLadderLp({ tier: "UNRANKED", rank: "", leaguePoints: 7 })).toBe(7);
  });
});

describe("compareRanks", () => {
  it("orders by tier, division, then LP", () => {
    expect(compareRanks({ tier: "GOLD", rank: "I", leaguePoints: 99 }, { tier: "PLATINUM", rank: "IV", leaguePoints: 0 })).toBe("higher");
    expect(compareRanks({ tier: "GOLD", rank: "II", leaguePoints: 50 }, { tier: "GOLD", rank: "III", leaguePoints: 99 })).toBe("lower");
    expect(compareRanks({ tier: "GOLD", rank: "II", leaguePoints: 50 }, { tier: "GOLD", rank: "II", leaguePoints: 50 })).toBe("same");
  });
});

describe("ladderLpLabel / prettyTier", () => {
  it("labels division boundaries", () => {
    expect(ladderLpLabel(rankToLadderLp({ tier: "DIAMOND", rank: "IV", leaguePoints: 0 }))).toBe("D IV");
    expect(ladderLpLabel(rankToLadderLp({ tier: "EMERALD", rank: "I", leaguePoints: 0 }))).toBe("E I");
    expect(ladderLpLabel(rankToLadderLp({ tier: "MASTER", rank: "I", leaguePoints: 0 }))).toBe("Master");
  });

  it("prettifies tiers", () => {
    expect(prettyTier("DIAMOND", "IV")).toBe("Diamond IV");
    expect(prettyTier("GRANDMASTER", "I")).toBe("Grandmaster");
  });
});
