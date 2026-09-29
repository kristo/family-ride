import { NextResponse } from "next/server";
import { listReviews } from "@/lib/server/route-reviews";
import type { RouteReviewStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asStatus(value: string | null): RouteReviewStatus | undefined {
  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }
  return undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = asStatus(url.searchParams.get("status"));

  const reviews = await listReviews(status);
  return NextResponse.json({ reviews });
}
