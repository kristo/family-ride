import { NextResponse } from "next/server";
import { deletePublishedRoute } from "@/lib/server/community-routes";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const deleted = await deletePublishedRoute(id);
  if (!deleted) {
    return NextResponse.json({ error: "Nie znaleziono trasy." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
