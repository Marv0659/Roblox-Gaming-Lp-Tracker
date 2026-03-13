import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth is enforced in server layouts to keep this Edge bundle under 1 MB.
// See (dashboard)/layout.tsx and auth/layout.tsx.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
