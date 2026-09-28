import { NextResponse } from "next/server";
import { listSubmissions } from "@/lib/server/community-routes";
import type { RouteSubmissionStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asStatus(value: string | null): RouteSubmissionStatus | undefined {
  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }
  return undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = asStatus(url.searchParams.get("status"));

  const submissions = await listSubmissions(status);
  return NextResponse.json({ submissions });
}
