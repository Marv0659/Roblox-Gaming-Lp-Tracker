import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/leaderboard";

/**
 * GET /api/leaderboard — returns leaderboard as JSON.
 */
export async function GET() {
  const entries = await getLeaderboard();
  return NextResponse.json(entries);
}
