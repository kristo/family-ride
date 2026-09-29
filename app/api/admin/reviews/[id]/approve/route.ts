import { NextResponse } from "next/server";
import { approveReview } from "@/lib/server/route-reviews";

export const runtime = "nodejs";

type ApprovePayload = {
  reviewedBy?: string;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let payload: ApprovePayload = {};
  try {
    payload = (await request.json()) as ApprovePayload;
  } catch {
    payload = {};
  }

  const review = await approveReview({ id, reviewedBy: payload.reviewedBy });
  if (!review) {
    return NextResponse.json({ error: "Nie znaleziono oceny." }, { status: 404 });
  }

  return NextResponse.json({ success: true, review });
}
