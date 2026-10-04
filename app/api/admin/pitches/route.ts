import { NextResponse } from "next/server";
import { isPitchStatus, listPitches } from "@/lib/server/route-pitches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const status = new URL(request.url).searchParams.get("status");
  const pitches = await listPitches(isPitchStatus(status) ? status : undefined);
  return NextResponse.json({ pitches });
}
