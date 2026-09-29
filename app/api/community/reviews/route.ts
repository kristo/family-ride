import { NextResponse } from "next/server";
import { createReview } from "@/lib/server/route-reviews";

export const runtime = "nodejs";

type ReviewPayload = {
  routeId?: string;
  routeName?: string;
  rating?: number;
  comment?: string;
  authorName?: string;
};

export async function POST(request: Request) {
  let payload: ReviewPayload;
  try {
    payload = (await request.json()) as ReviewPayload;
  } catch {
    return NextResponse.json({ error: "Niepoprawny payload JSON." }, { status: 400 });
  }

  const routeId = typeof payload.routeId === "string" ? payload.routeId : "";
  const routeName = typeof payload.routeName === "string" ? payload.routeName : "";
  const rating = Number(payload.rating);

  if (!routeId || !routeName) {
    return NextResponse.json({ error: "Brakuje trasy, której dotyczy ocena." }, { status: 400 });
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Ocena musi być liczbą od 1 do 5." }, { status: 400 });
  }

  try {
    const review = await createReview({
      routeId,
      routeName,
      rating,
      comment: typeof payload.comment === "string" ? payload.comment : undefined,
      authorName: typeof payload.authorName === "string" ? payload.authorName : undefined,
    });

    if (!review) {
      return NextResponse.json({ error: "Niepoprawne dane oceny." }, { status: 400 });
    }

    return NextResponse.json({ success: true, review: { id: review.id, status: review.status } });
  } catch {
    return NextResponse.json({ error: "Nie udało się zapisać oceny." }, { status: 500 });
  }
}
