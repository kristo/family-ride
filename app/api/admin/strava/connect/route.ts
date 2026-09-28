import { NextResponse } from "next/server";
import { buildStravaAuthUrl, getStravaConfig, makeOAuthState, setOauthStateCookieHeaders } from "@/lib/server/strava";

export const runtime = "nodejs";

export async function GET() {
  const config = getStravaConfig();

  if (!config.isConfigured) {
    return NextResponse.json(
      {
        error: "Strava nie jest skonfigurowana. Ustaw STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET i NEXT_PUBLIC_APP_URL.",
      },
      { status: 400 }
    );
  }

  const state = makeOAuthState();
  const authUrl = buildStravaAuthUrl(state);

  const response = NextResponse.json({ authUrl });
  response.headers.append("Set-Cookie", setOauthStateCookieHeaders(state));
  return response;
}
