import { NextResponse, after } from "next/server";
import { subscribeToNewsletter } from "@/lib/server/newsletter";
import { notifyOwner } from "@/lib/server/notify";
import { clientIp, isRateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (isRateLimited(`newsletter:${clientIp(request)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Zbyt wiele prób zapisu. Spróbuj za kilka minut." }, { status: 429 });
  }

  let payload: { email?: unknown };
  try {
    payload = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ error: "Niepoprawny payload JSON." }, { status: 400 });
  }

  const email = typeof payload?.email === "string" ? payload.email : "";

  try {
    const result = await subscribeToNewsletter(email, "homepage");

    if (result.status === "invalid") {
      return NextResponse.json({ error: "Podaj poprawny adres e-mail." }, { status: 400 });
    }

    if (result.status === "exists") {
      return NextResponse.json({ ok: true, status: "exists" });
    }

    after(() =>
      notifyOwner("Family Ride: nowy zapis na newsletter", [
        "Ktoś zapisał się na newsletter.",
        `E-mail: ${email.trim().toLowerCase()}`,
      ]),
    );

    return NextResponse.json({ ok: true, status: "subscribed" });
  } catch (error) {
    console.error("newsletter/subscribe: zapis nieudany", error);
    return NextResponse.json({ error: "Nie udało się zapisać do newslettera." }, { status: 500 });
  }
}
