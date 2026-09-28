import { NextResponse } from "next/server";
import {
  calculateTrackMetrics,
  fetchActivities,
  fetchActivityStreams,
  getValidToken,
  readStravaTokenFromCookie,
  saveActivityAsGpx,
  setStravaAuthCookieHeader,
} from "@/lib/server/strava";
import { estimateSurfaceBreakdown } from "@/lib/server/surface-estimation";

export const runtime = "nodejs";

type ImportPayload = {
  activityId?: number;
};

export async function POST(request: Request) {
  const token = readStravaTokenFromCookie(request.headers.get("cookie"));

  if (!token) {
    return NextResponse.json({ error: "Brak autoryzacji Strava." }, { status: 401 });
  }

  let payload: ImportPayload;
  try {
    payload = (await request.json()) as ImportPayload;
  } catch {
    return NextResponse.json({ error: "Niepoprawne dane importu." }, { status: 400 });
  }

  const activityId = Number(payload.activityId);
  if (!Number.isFinite(activityId) || activityId <= 0) {
    return NextResponse.json({ error: "Brak poprawnego activityId." }, { status: 400 });
  }

  try {
    const { token: validToken, refreshed } = await getValidToken(token);
    const streams = await fetchActivityStreams(validToken.access_token, activityId);

    const points = streams.latlng?.data ?? [];
    if (points.length < 2) {
      return NextResponse.json({ error: "Wybrana aktywność nie zawiera wystarczajacych punktow GPS." }, { status: 400 });
    }

    const activities = await fetchActivities(validToken.access_token, 50);
    const activity = activities.find((item) => item.id === activityId);
    const activityName = activity?.name ?? `Strava ${activityId}`;

    const saved = await saveActivityAsGpx({
      activityId,
      activityName,
      latlngPoints: points,
      altitudeData: streams.altitude?.data,
    });

    const metrics = calculateTrackMetrics(points, streams.altitude?.data);
    const fallbackElevation = Math.round(activity?.total_elevation_gain ?? 0);
    const surface = await estimateSurfaceBreakdown(points);

    const response = NextResponse.json({
      success: true,
      source: "strava",
      activity: {
        id: activityId,
        name: activityName,
      },
      file: {
        name: saved.fileName,
        url: saved.url,
      },
      metrics: {
        distanceKm: metrics.distanceKm,
        elevationM: metrics.elevationGainM > 0 ? metrics.elevationGainM : fallbackElevation,
      },
      surface,
    });

    if (refreshed) {
      response.headers.append("Set-Cookie", setStravaAuthCookieHeader(validToken));
    }

    return response;
  } catch {
    return NextResponse.json({ error: "Import aktywności ze Strava nie powiódł sie." }, { status: 500 });
  }
}
