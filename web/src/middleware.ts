import { NextRequest, NextResponse } from "next/server";

const appHost = (process.env.NEXT_PUBLIC_APP_HOST ?? "monerp.vercel.app").toLowerCase();
const publicBaseDomain = (process.env.NEXT_PUBLIC_PUBLIC_HOST ?? "monerp.vercel.app")
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const isAppHost = hostname === appHost || hostname === `www.${appHost}`;
  const isAutomaticDomain = hostname.endsWith(`.${publicBaseDomain}`) && hostname !== publicBaseDomain;
  const isCustomDomain = !isLocalhost && !isAppHost && hostname.includes(".") && !hostname.endsWith("vercel.app");

  if ((isAutomaticDomain || isCustomDomain) && !request.nextUrl.pathname.startsWith("/website/public/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/website/public/${hostname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};