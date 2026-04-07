import { NextResponse } from "next/server";
import { syncAllPlayers, syncNextPlayerForCron } from "@/app/actions/players";

/**
 * Vercel Cron / external cron (cron-job.org): syncs tracked players.
 * Set CRON_SECRET in Vercel env; send Authorization: Bearer <CRON_SECRET>.
 *
 * - Default: sync **all** players (can exceed 30s — use for daily Vercel cron or high timeouts).
 * - `?mode=step`: sync **one** player per request (rotates). Use for cron-job.org 30s timeout.
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

  const mode = new URL(request.url).searchParams.get("mode");

  if (mode === "step" || mode === "one") {
    const result = await syncNextPlayerForCron();
    if (result.ok) {
      return NextResponse.json({
        ok: true,
        mode: "step",
        playerId: result.playerId,
        gameName: result.gameName,
        matchesAdded: result.matchesAdded,
        skippedDueToLock: result.skippedDueToLock ?? false,
        step: result.step,
        total: result.total,
      });
    }
    return NextResponse.json(
      { ok: false, mode: "step", error: result.error },
      { status: 500 }
    );
  }

  const result = await syncAllPlayers();

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      playersSynced: result.playersSynced,
      playersSkipped: result.playersSkipped,
      totalMatchesAdded: result.totalMatchesAdded,
    });
  }

  return NextResponse.json(
    {
      ok: false,
      error: result.error,
      playersSynced: result.playersSynced,
      playersSkipped: result.playersSkipped,
      totalMatchesAdded: result.totalMatchesAdded,
      errors: result.errors,
    },
    { status: 500 }
  );
}
