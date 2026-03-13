/**
 * Vercel Cron: runs sync-all on a schedule.
 *
 * Required env:
 *   CRON_SECRET - Set in Vercel (Settings → Environment Variables) and in .env.local for local testing.
 *   Pass as header: Authorization: Bearer <CRON_SECRET>. Do not expose to the client.
 *
 * To change the schedule: edit vercel.json "crons"[].schedule (cron expression, UTC).
 * Example: "0 6 * * *" = daily at 06:00 UTC. For every 6 hours, use 0 in min and 6 in hour.
 */

import { NextResponse } from "next/server";
import { syncAllPlayers } from "@/app/actions/players";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // allow up to 5 min for many players

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Cron not configured (missing CRON_SECRET)" },
      { status: 500 }
    );
  }

  if (!token || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllPlayers();

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        summary: {
          playersProcessed: result.playersSynced,
          succeeded: result.playersSynced,
          failed: 0,
          totalMatchesAdded: result.totalMatchesAdded,
        },
      });
    }

    const failed = result.errors?.length ?? 0;
    const succeeded = result.playersSynced ?? 0;
    return NextResponse.json({
      ok: false,
      error: result.error,
      summary: {
        playersProcessed: succeeded + failed,
        succeeded,
        failed,
        totalMatchesAdded: result.totalMatchesAdded ?? 0,
      },
      errors: result.errors,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync cron failed.";
    return NextResponse.json(
      { ok: false, error: message, summary: null },
      { status: 500 }
    );
  }
}
