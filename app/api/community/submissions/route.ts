import { NextResponse } from "next/server";
import { createSubmission } from "@/lib/server/community-routes";
import type { RouteDraft, RouteSurfaceEstimate } from "@/lib/types";

export const runtime = "nodejs";

type SubmissionPayload = {
  submitterName?: string;
  submitterEmail?: string;
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

function normalizeDraft(input: SubmissionPayload["draft"]): RouteDraft | null {
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
    !Number.isFinite(rating) ||
    gpxUrl.length === 0
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
    gallery:
      gallery.length > 0
        ? gallery
        : [
            {
              src: "/photos/family-bike-1.jpg",
              alt: "Podglad trasy",
              caption: "Material dodany przez użytkownika.",
            },
          ],
  };
}

export async function POST(request: Request) {
  let payload: SubmissionPayload;
  try {
    payload = (await request.json()) as SubmissionPayload;
  } catch {
    return NextResponse.json({ error: "Niepoprawny payload JSON." }, { status: 400 });
  }

  const submitterName = asString(payload.submitterName);
  if (submitterName.length < 2) {
    return NextResponse.json({ error: "Podaj imię lub nazwe autora trasy." }, { status: 400 });
  }

  const draft = normalizeDraft(payload.draft);
  if (!draft) {
    return NextResponse.json({ error: "Brakuje wymaganych danych trasy." }, { status: 400 });
  }

  try {
    const submission = await createSubmission({
      submitterName,
      submitterEmail: asString(payload.submitterEmail) || undefined,
      draft,
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
      },
    });
  } catch {
    return NextResponse.json({ error: "Nie udało się zapisac zgłoszeńia." }, { status: 500 });
  }
}
