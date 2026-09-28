import { NextResponse } from "next/server";
import {
  fetchAthlete,
  getStravaConfig,
  getValidToken,
  readStravaTokenFromCookie,
  setStravaAuthCookieHeader,
} from "@/lib/server/strava";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = getStravaConfig();

  if (!config.isConfigured) {
    return NextResponse.json({
      configured: false,
      connected: false,
    });
  }

  const token = readStravaTokenFromCookie(request.headers.get("cookie"));
  if (!token) {
    return NextResponse.json({
      configured: true,
      connected: false,
    });
  }

  try {
    const { token: validToken, refreshed } = await getValidToken(token);
    const athlete = await fetchAthlete(validToken.access_token);

    const response = NextResponse.json({
      configured: true,
      connected: true,
      athlete,
    });

    if (refreshed) {
      response.headers.append("Set-Cookie", setStravaAuthCookieHeader(validToken));
    }

    return response;
  } catch {
    return NextResponse.json({
      configured: true,
      connected: false,
    });
  }
}
