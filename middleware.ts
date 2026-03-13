import { auth } from "@/auth";

export default auth((req) => {
  const isSignedIn = !!req.auth;
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/auth/signin") ||
    req.nextUrl.pathname.startsWith("/auth/error");
  if (isAuthPage && isSignedIn) {
    return Response.redirect(new URL("/dashboard", req.url));
  }
  if (!isAuthPage && !isSignedIn) {
    return Response.redirect(new URL("/auth/signin", req.url));
  }
  return undefined;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
