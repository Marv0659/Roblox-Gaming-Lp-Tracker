import { describe, expect, it } from "vitest";
import { storedMatchIsComplete } from "@/lib/riot/sync-helpers";

const puuidToId = new Map([
  ["puuid-a", "player-a"],
  ["puuid-b", "player-b"],
]);

describe("storedMatchIsComplete", () => {
  it("legacy rows (no puuids) are complete once this player has a row", () => {
    expect(storedMatchIsComplete({ participantPuuids: [], participantIds: ["player-a"] }, "player-a", puuidToId)).toBe(true);
    expect(storedMatchIsComplete({ participantPuuids: [], participantIds: ["player-b"] }, "player-a", puuidToId)).toBe(false);
  });

  it("new rows need every tracked participant", () => {
    const puuids = ["puuid-a", "puuid-b", "puuid-x"];
    expect(storedMatchIsComplete({ participantPuuids: puuids, participantIds: ["player-a"] }, "player-a", puuidToId)).toBe(false);
    expect(
      storedMatchIsComplete({ participantPuuids: puuids, participantIds: ["player-a", "player-b"] }, "player-a", puuidToId)
    ).toBe(true);
  });
});
