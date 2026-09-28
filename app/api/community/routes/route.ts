import { NextResponse } from "next/server";
import { listPublishedRoutes } from "@/lib/server/community-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const routes = await listPublishedRoutes();
  return NextResponse.json({ routes });
}
