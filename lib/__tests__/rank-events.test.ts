import { describe, expect, it } from "vitest";
import { getRankEventsToCreate } from "@/lib/rank-events";
import { rankToScore } from "@/lib/rank-utils";

const types = (events: { eventType: string }[]) => events.map((e) => e.eventType).sort();

describe("getRankEventsToCreate", () => {
  it("first snapshot is PLACED + NEW_PEAK", () => {
    expect(types(getRankEventsToCreate(null, { tier: "GOLD", rank: "IV", leaguePoints: 0 }, -Infinity))).toEqual([
      "NEW_PEAK",
      "PLACED",
    ]);
  });

  it("promotion above previous peak", () => {
    const prev = { tier: "GOLD", rank: "I", leaguePoints: 90 };
    const next = { tier: "PLATINUM", rank: "IV", leaguePoints: 15 };
    expect(types(getRankEventsToCreate(prev, next, rankToScore(prev)))).toEqual(["NEW_PEAK", "PROMOTED"]);
  });

  it("demotion creates no peak", () => {
    const prev = { tier: "PLATINUM", rank: "IV", leaguePoints: 0 };
    const next = { tier: "GOLD", rank: "I", leaguePoints: 75 };
    expect(types(getRankEventsToCreate(prev, next, rankToScore(prev)))).toEqual(["DEMOTED"]);
  });

  it("reaching 100 LP at Master+", () => {
    const prev = { tier: "MASTER", rank: "I", leaguePoints: 80 };
    const next = { tier: "MASTER", rank: "I", leaguePoints: 102 };
    expect(types(getRankEventsToCreate(prev, next, rankToScore(prev)))).toContain("REACHED_100_LP");
  });
});

describe("LP changes inside a division", () => {
  it("losing LP in the same division is not a demotion", () => {
    const prev = { tier: "DIAMOND", rank: "IV", leaguePoints: 97 };
    const next = { tier: "DIAMOND", rank: "IV", leaguePoints: 95 };
    expect(types(getRankEventsToCreate(prev, next, rankToScore(prev)))).toEqual([]);
  });

  it("gaining LP in the same division is only a peak, not a promotion", () => {
    const prev = { tier: "GOLD", rank: "II", leaguePoints: 40 };
    const next = { tier: "GOLD", rank: "II", leaguePoints: 60 };
    expect(types(getRankEventsToCreate(prev, next, rankToScore(prev)))).toEqual(["NEW_PEAK"]);
  });
});
