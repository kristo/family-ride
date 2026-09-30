import { NextResponse } from "next/server";
import { deletePublishedRoute, updatePublishedRouteFromDraft } from "@/lib/server/community-routes";
import type { RouteDraft, RouteSurfaceEstimate, RouteVerificationLevel } from "@/lib/types";
import { revalidatePublicPages } from "@/lib/server/revalidate-site";

export const runtime = "nodejs";

type UpdatePayload = {
  reviewedBy?: string;
  note?: string;
  verificationLevel?: RouteVerificationLevel;
  draft?: Partial<RouteDraft> & {
    surfaceEstimate?: RouteSurfaceEstimate | null;
  };
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function normalizeDraft(input: UpdatePayload["draft"]): RouteDraft | null {
  if (!input) {
    return null;
  }

  const name = asString(input.name);
  const region = asString(input.region);
  const description = asString(input.description);
  const hardestPart = asString(input.hardestPart);
  const parking = asString(input.parking);
  const food = asString(input.food);
  const sleep = asString(input.sleep);
  const familyNote = asString(input.familyNote);
  const gpxUrl = asString(input.gpxUrl);
  const mapEmbedUrl = asString(input.mapEmbedUrl);

  const distanceKm = asNumber(input.distanceKm);
  const elevationM = asNumber(input.elevationM);
  const minAge = asNumber(input.minAge);
  const asphaltPct = asNumber(input.asphaltPct);
  const rating = asNumber(input.rating);

  if (
    name.length < 3 ||
    region.length < 2 ||
    description.length < 10 ||
    !Number.isFinite(distanceKm) ||
    !Number.isFinite(elevationM) ||
    !Number.isFinite(minAge) ||
    !Number.isFinite(asphaltPct) ||
    !Number.isFinite(rating)
  ) {
    return null;
  }

  const gallery = Array.isArray(input.gallery)
    ? input.gallery
        .filter((item): item is { src: string; alt: string; caption: string } => {
          if (!item || typeof item !== "object") {
            return false;
          }
          const src = asString((item as { src?: unknown }).src);
          return src.length > 0;
        })
        .map((item, index) => ({
          src: asString(item.src),
          alt: asString(item.alt) || `${name} - zdjęcie ${index + 1}`,
          caption: asString(item.caption) || `Kadr ${index + 1} z trasy`,
        }))
    : [];

  return {
    name,
    region,
    distanceKm,
    elevationM,
    minAge,
    asphaltPct: Math.max(0, Math.min(100, asphaltPct)),
    rating: Math.max(1, Math.min(5, rating)),
    description,
    hardestPart,
    parking,
    food,
    sleep,
    attractions: asStringArray(input.attractions),
    familyNote,
    gpxUrl,
    mapEmbedUrl,
    stravaUrl: asString(input.stravaUrl) || undefined,
    videoUrl: asString(input.videoUrl) || undefined,
    bestMonths: asStringArray(input.bestMonths),
    packingList: asStringArray(input.packingList),
    surfaceEstimate: input.surfaceEstimate ?? undefined,
    // Brak zdjęć nie jest błędem - RouteCard i strona trasy mają własny, marką Family Ride
    // opatrzony placeholder na czas, aż ktoś doda prawdziwe zdjęcie. Wcześniej wstawiany tu
    // był ten sam stockowy plik dla każdej trasy bez zdjęcia, co po dodaniu prawdziwego
    // zdjęcia w kolejnym kroku (dopisywanym, nie zastępującym) zostawiało dwa zdjęcia w
    // galerii i pokazywało na kafelku dalej ten sam stockowy kadr co inne trasy.
    gallery,
  };
}

function normalizeVerificationLevel(value: unknown): RouteVerificationLevel {
  return value === "verified" || value === "community" || value === "draft" ? value : "draft";
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let payload: UpdatePayload;
  try {
    payload = (await request.json()) as UpdatePayload;
  } catch {
    return NextResponse.json({ error: "Niepoprawny payload JSON." }, { status: 400 });
  }

  const draft = normalizeDraft(payload.draft);
  if (!draft) {
    return NextResponse.json({ error: "Brakuje wymaganych danych trasy." }, { status: 400 });
  }

  const route = await updatePublishedRouteFromDraft({
    routeId: id,
    draft,
    verificationLevel: normalizeVerificationLevel(payload.verificationLevel),
    reviewedBy: asString(payload.reviewedBy) || undefined,
    note: asString(payload.note) || undefined,
  });

  if (!route) {
    return NextResponse.json({ error: "Nie znaleziono trasy." }, { status: 404 });
  }

  revalidatePublicPages({ routeId: id });
  return NextResponse.json({ success: true, route });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const deleted = await deletePublishedRoute(id);
  if (!deleted) {
    return NextResponse.json({ error: "Nie znaleziono trasy." }, { status: 404 });
  }

  revalidatePublicPages({ routeId: id });
  return NextResponse.json({ success: true });
}
