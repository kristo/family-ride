import { NextResponse } from "next/server";
import { subscribeToNewsletter } from "@/lib/server/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: string };
    const email = typeof payload.email === "string" ? payload.email : "";

    const result = await subscribeToNewsletter(email, "homepage");

    if (result.status === "invalid") {
      return NextResponse.json({ error: "Podaj poprawny adres e-mail." }, { status: 400 });
    }

    if (result.status === "exists") {
      return NextResponse.json({ ok: true, status: "exists" });
    }

    return NextResponse.json({ ok: true, status: "subscribed" });
  } catch {
    return NextResponse.json({ error: "Nie udało się zapisać do newslettera." }, { status: 500 });
  }
}
