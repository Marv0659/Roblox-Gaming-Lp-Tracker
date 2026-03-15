import { NextResponse } from "next/server";
import { syncAllPlayers } from "@/app/actions/players";

/**
 * Vercel Cron: syncs rank + matches for all tracked players.
 * Set CRON_SECRET in Vercel env; cron sends Authorization: Bearer <CRON_SECRET>.
 * Schedule is in vercel.json crons[].schedule (cron expression, UTC).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const secret = process.env.CRON_SECRET;

  if (!secret || token !== secret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const result = await syncAllPlayers();

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      playersSynced: result.playersSynced,
      totalMatchesAdded: result.totalMatchesAdded,
    });
  }

  return NextResponse.json(
    {
      ok: false,
      error: result.error,
      playersSynced: result.playersSynced,
      totalMatchesAdded: result.totalMatchesAdded,
      errors: result.errors,
    },
    { status: 500 }
  );
}
