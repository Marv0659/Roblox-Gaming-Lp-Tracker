// Temporary: check if Google env vars are visible on the server. Remove after debugging.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const hasId = !!process.env.AUTH_GOOGLE_ID;
  const hasSecret = !!process.env.AUTH_GOOGLE_SECRET;
  return NextResponse.json({
    googleConfigured: hasId && hasSecret,
    hasId,
    hasSecret,
    env: process.env.NODE_ENV,
  });
}
