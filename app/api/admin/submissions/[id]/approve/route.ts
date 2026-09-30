import { NextResponse } from "next/server";
import { approveSubmission } from "@/lib/server/community-routes";
import { revalidatePublicPages } from "@/lib/server/revalidate-site";

export const runtime = "nodejs";

type ApprovePayload = {
  adminNote?: string;
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

  const approved = await approveSubmission({
    id,
    adminNote: payload.adminNote,
    reviewedBy: payload.reviewedBy,
  });

  if (!approved) {
    return NextResponse.json({ error: "Nie znaleziono zgłoszenia." }, { status: 404 });
  }

  revalidatePublicPages();
  return NextResponse.json({
    success: true,
    submission: approved.submission,
    route: approved.route,
  });
}
