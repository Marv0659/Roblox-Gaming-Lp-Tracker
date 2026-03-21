import { getRankedWrappedBundle } from "@/lib/ranked-wrapped";
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

  return (
    <RankedWrappedShell bundle={bundle} selectedPlayerId={playerId} />
  );
}
