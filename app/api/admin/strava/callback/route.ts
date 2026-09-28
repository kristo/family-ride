import { NextResponse } from "next/server";
import {
  clearOauthStateCookieHeader,
  exchangeCodeForToken,
  getStravaConfig,
  readOauthStateFromCookie,
  setStravaAuthCookieHeader,
} from "@/lib/server/strava";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = getStravaConfig();
  const appUrl = config.appUrl ?? "";

  if (!config.isConfigured) {
    return NextResponse.redirect(`${appUrl}/admin?strava=missing-config`);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = readOauthStateFromCookie(request.headers.get("cookie"));

  if (!code || !state || !expectedState || state !== expectedState) {
    const response = NextResponse.redirect(`${appUrl}/admin?strava=oauth-error`);
    response.headers.append("Set-Cookie", clearOauthStateCookieHeader());
    return response;
  }

  try {
    const token = await exchangeCodeForToken(code);
    const response = NextResponse.redirect(`${appUrl}/admin?strava=connected`);
    response.headers.append("Set-Cookie", setStravaAuthCookieHeader(token));
    response.headers.append("Set-Cookie", clearOauthStateCookieHeader());
    return response;
  } catch {
    const response = NextResponse.redirect(`${appUrl}/admin?strava=token-error`);
    response.headers.append("Set-Cookie", clearOauthStateCookieHeader());
    return response;
  }
}
