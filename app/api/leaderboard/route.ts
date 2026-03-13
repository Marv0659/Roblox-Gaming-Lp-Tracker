import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLeaderboard } from "@/lib/leaderboard";

/**
 * GET /api/leaderboard — returns leaderboard as JSON.
 * Requires authenticated session. Extension: use for external clients or cron.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const entries = await getLeaderboard();
  return NextResponse.json(entries);
}
