import { NextResponse } from "next/server";
import {
  fetchActivities,
  getValidToken,
  readStravaTokenFromCookie,
  setStravaAuthCookieHeader,
} from "@/lib/server/strava";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = readStravaTokenFromCookie(request.headers.get("cookie"));

  if (!token) {
    return NextResponse.json({ error: "Brak autoryzacji Strava." }, { status: 401 });
  }

  const url = new URL(request.url);
  const perPageParam = Number(url.searchParams.get("perPage") ?? "20");
  const perPage = Number.isFinite(perPageParam) ? perPageParam : 20;

  try {
    const { token: validToken, refreshed } = await getValidToken(token);
    const activities = await fetchActivities(validToken.access_token, perPage);

    const response = NextResponse.json({ activities });
    if (refreshed) {
      response.headers.append("Set-Cookie", setStravaAuthCookieHeader(validToken));
    }

    return response;
  } catch {
    return NextResponse.json({ error: "Nie udało się pobrac aktywności Strava." }, { status: 500 });
  }
}
