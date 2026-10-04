import { NextResponse } from "next/server";
import { isPitchStatus, updatePitch } from "@/lib/server/route-pitches";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let payload: { status?: unknown; adminNote?: unknown; publishedRouteId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Niepoprawny payload JSON." }, { status: 400 });
  }

  if (!isPitchStatus(payload.status)) {
    return NextResponse.json({ error: "Niepoprawny status." }, { status: 400 });
  }

  const pitch = await updatePitch({
    id,
    status: payload.status,
    adminNote: typeof payload.adminNote === "string" ? payload.adminNote : undefined,
    publishedRouteId: typeof payload.publishedRouteId === "string" ? payload.publishedRouteId : undefined,
  });

  if (!pitch) {
    return NextResponse.json({ error: "Nie znaleziono propozycji." }, { status: 404 });
  }

  return NextResponse.json({ success: true, pitch });
}
