import { describe, expect, it } from "vitest";
import { computeChampionTrust } from "@/lib/champion-trust";
import type { MatchParticipantInput } from "@/lib/derived-stats";

let t = Date.UTC(2026, 0, 1);
/** Builds games newest-first, `results` read left (newest) to right. */
function games(championName: string, results: string, gameDuration = 1800): MatchParticipantInput[] {
  return [...results].map((r) => ({
    win: r === "W",
    championName,
    kills: 5,
    deaths: 3,
    assists: 7,
    gameStartAt: new Date((t -= 3_600_000)),
    gameDuration,
  }));
}

const label = (rows: ReturnType<typeof computeChampionTrust>, champ: string) =>
  rows.find((r) => r.championName === champ)?.trustLabel;

describe("computeChampionTrust", () => {
  it("hides champions below the minimum sample", () => {
    expect(computeChampionTrust(games("Ahri", "WW"))).toEqual([]);
  });

  it("small sample with high winrate is a pocket pick", () => {
    expect(label(computeChampionTrust(games("Ahri", "WWW")), "Ahri")).toBe("POCKET_PICK");
  });

  it("most played with poor results is a fake comfort pick", () => {
    expect(label(computeChampionTrust(games("Yasuo", "LLWLLWLLWL")), "Yasuo")).toBe("FAKE_COMFORT_PICK");
  });

  it("solid long sample is trusted", () => {
    const rows = computeChampionTrust([
      ...games("Garen", "LLLLLL"),
      ...games("Darius", "LLLLLLL"),
      ...games("Sett", "LLLLLLLL"),
      ...games("Ornn", "WLWWLWWLWW"),
    ]);
    expect(label(rows, "Ornn")).toBe("TRUSTED");
  });

  it("ignores remakes", () => {
    expect(computeChampionTrust(games("Ahri", "LLL", 120))).toEqual([]);
  });
});
