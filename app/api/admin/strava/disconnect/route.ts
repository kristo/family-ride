import { NextResponse } from "next/server";
import { clearStravaAuthCookieHeader } from "@/lib/server/strava";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.append("Set-Cookie", clearStravaAuthCookieHeader());
  return response;
}
