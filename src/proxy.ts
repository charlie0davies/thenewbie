import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/lib/auth/amplify-server";

const PROTECTED = ["/today", "/workout", "/nutrition", "/progress", "/shopping", "/onboarding"];
const AUTH_ONLY = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthOnly = AUTH_ONLY.some((p) => pathname.startsWith(p));

  if (!isProtected && !isAuthOnly) return response;

  const authenticated = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (ctx) => {
      try {
        const session = await fetchAuthSession(ctx);
        return !!session.tokens?.accessToken;
      } catch {
        return false;
      }
    },
  });

  if (!authenticated && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (authenticated && isAuthOnly) {
    return NextResponse.redirect(new URL("/today", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
