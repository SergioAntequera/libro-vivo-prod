import { NextResponse, type NextRequest } from "next/server";
import {
  buildLoginHref,
  isGuestOnlyAuthPath,
  isProtectedAppPath,
  normalizeAuthNextHref,
  shouldBypassAuthMiddleware,
} from "@/lib/authRouteConfig";
import {
  AUTH_ACCESS_TOKEN_COOKIE,
  isFreshAccessToken,
  readAuthAccessTokenFromCookieHeader,
} from "@/lib/authSessionCookie";

function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_ACCESS_TOKEN_COOKIE, "", {
    maxAge: 0,
    path: "/",
  });
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (shouldBypassAuthMiddleware(pathname)) {
    return NextResponse.next();
  }

  const accessToken = readAuthAccessTokenFromCookieHeader(req.headers.get("cookie"));
  const hasFreshSession = isFreshAccessToken(accessToken);
  const currentHref = normalizeAuthNextHref(`${pathname}${search}`) ?? pathname;

  if (pathname === "/") {
    const target = hasFreshSession ? "/home" : "/login";
    return NextResponse.redirect(new URL(target, req.url));
  }

  if (isGuestOnlyAuthPath(pathname) && hasFreshSession) {
    const target =
      normalizeAuthNextHref(req.nextUrl.searchParams.get("next")) ?? "/home";
    return NextResponse.redirect(new URL(target, req.url));
  }

  if (isProtectedAppPath(pathname) && !hasFreshSession) {
    const response = NextResponse.redirect(
      new URL(buildLoginHref(currentHref), req.url),
    );
    if (accessToken) clearAuthCookie(response);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
