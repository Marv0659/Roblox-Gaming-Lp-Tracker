import { getRankedWrappedBundle } from "@/lib/ranked-wrapped";
import { getChampionIdsByName } from "@/lib/champion-ids";
import { RankedWrappedShell } from "@/components/ranked-wrapped-ui";

export const dynamic = "force-dynamic";

export default async function RankedWrappedPage({
  searchParams,
}: {
  searchParams: Promise<{ player?: string }>;
}) {
  const params = await searchParams;
  const playerId = params.player;

  const bundle = await getRankedWrappedBundle({ kind: "all" });
  const selected = bundle.players.find((p) => p.playerId === playerId);
  const championIds = selected
    ? await getChampionIdsByName(
        [
          selected.mostPlayedChampion,
          selected.bestChampion,
          selected.worstChampion,
          selected.championTrust.trusted,
          selected.championTrust.fakeComfort,
          selected.championTrust.coinflip,
        ].flatMap((c) => (c ? [c.name] : []))
      )
    : {};

  return (
    <RankedWrappedShell bundle={bundle} selectedPlayerId={playerId} championIds={championIds} />
  );
}
