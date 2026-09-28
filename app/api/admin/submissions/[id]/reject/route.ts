import { NextResponse } from "next/server";
import { rejectSubmission } from "@/lib/server/community-routes";

export const runtime = "nodejs";

type RejectPayload = {
  adminNote?: string;
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

  const rejected = await rejectSubmission({
    id,
    adminNote: payload.adminNote,
    reviewedBy: payload.reviewedBy,
  });

  if (!rejected) {
    return NextResponse.json({ error: "Nie znaleziono zgłoszenia." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    submission: rejected,
  });
}
