import { describe, expect, it } from "vitest";
import {
  currentLossStreak,
  currentWinStreak,
  isRemake,
  lpGainedInWindow,
  winrateLastN,
  type MatchParticipantInput,
} from "@/lib/derived-stats";

function m(win: boolean, gameDuration = 1800): MatchParticipantInput {
  return { win, championName: "Ahri", kills: 1, deaths: 1, assists: 1, gameStartAt: new Date(), gameDuration };
}

describe("derived stats", () => {
  it("detects remakes by duration", () => {
    expect(isRemake({ gameDuration: 180 })).toBe(true);
    expect(isRemake({ gameDuration: 900 })).toBe(false);
  });

  it("streaks count from the most recent game", () => {
    const games = [m(true), m(true), m(false), m(true)];
    expect(currentWinStreak(games)).toBe(2);
    expect(currentLossStreak(games)).toBe(0);
    expect(currentLossStreak([m(false), m(true)])).toBe(1);
  });

  it("winrate over last N", () => {
    expect(winrateLastN([m(true), m(false), m(true), m(true)], 2)).toBe(50);
    expect(winrateLastN([], 5)).toBeNull();
  });

  it("LP gained in window is tier-aware", () => {
    const since = new Date("2026-01-01T00:00Z");
    const snaps = [
      { queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "I", leaguePoints: 90, createdAt: new Date("2026-01-02T00:00Z") },
      { queueType: "RANKED_SOLO_5x5", tier: "PLATINUM", rank: "IV", leaguePoints: 40, createdAt: new Date("2026-01-03T00:00Z") },
      { queueType: "RANKED_SOLO_5x5", tier: "SILVER", rank: "I", leaguePoints: 0, createdAt: new Date("2025-12-01T00:00Z") },
    ];
    expect(lpGainedInWindow(snaps, "RANKED_SOLO_5x5", since)).toBe(50);
  });
});
