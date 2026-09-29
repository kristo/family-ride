import { NextResponse } from "next/server";
import { getApprovedReviewSummaries } from "@/lib/server/route-reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const summaries = await getApprovedReviewSummaries();
  return NextResponse.json({ summaries });
}
