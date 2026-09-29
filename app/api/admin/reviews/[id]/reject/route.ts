import { NextResponse } from "next/server";
import { rejectReview } from "@/lib/server/route-reviews";

export const runtime = "nodejs";

type RejectPayload = {
  reviewedBy?: string;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let payload: RejectPayload = {};
  try {
    payload = (await request.json()) as RejectPayload;
  } catch {
    payload = {};
  }

  const review = await rejectReview({ id, reviewedBy: payload.reviewedBy });
  if (!review) {
    return NextResponse.json({ error: "Nie znaleziono oceny." }, { status: 404 });
  }

  return NextResponse.json({ success: true, review });
}
