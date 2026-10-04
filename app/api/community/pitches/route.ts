import { NextResponse } from "next/server";
import { createPitch } from "@/lib/server/route-pitches";
import { clientIp, isRateLimited } from "@/lib/server/rate-limit";
import type { PitchPoint, PitchPointKind } from "@/lib/types";

export const runtime = "nodejs";

const POINT_KINDS: PitchPointKind[] = ["start", "stop", "attraction", "food", "warning"];
const MAX_POINTS = 30;
const MAX_PHOTOS = 8;
// Min. czas od otwarcia formularza do wysłania - boty wysyłają natychmiast.
const MIN_FILL_MS = 4000;

type Payload = {
  submitterName?: unknown;
  submitterEmail?: unknown;
  name?: unknown;
  region?: unknown;
  description?: unknown;
  points?: unknown;
  photos?: unknown;
  rightsConfirmed?: unknown;
  // Honeypot: ukryte pole, które człowiek zostawia puste.
  website?: unknown;
  openedAt?: unknown;
};

function asString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isOwnImageUrl(value: string): boolean {
  return /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(value) || value.startsWith("/uploads/media/");
}

function parsePoints(value: unknown): PitchPoint[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const points: PitchPoint[] = [];
  for (const item of value.slice(0, MAX_POINTS)) {
    if (!item || typeof item !== "object") {
      return null;
    }
    const { lat, lng, kind, label } = item as Record<string, unknown>;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180 ||
      typeof kind !== "string" ||
      !(POINT_KINDS as string[]).includes(kind)
    ) {
      return null;
    }
    points.push({
      lat: Math.round(lat * 100000) / 100000,
      lng: Math.round(lng * 100000) / 100000,
      kind: kind as PitchPointKind,
      label: asString(label, 80),
    });
  }
  return points;
}

export async function POST(request: Request) {
  if (isRateLimited(`pitch:${clientIp(request)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Zbyt wiele zgłoszeń z tego adresu. Spróbuj za godzinę." }, { status: 429 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Niepoprawny payload JSON." }, { status: 400 });
  }

  // Bot: udajemy sukces, nic nie zapisujemy.
  const openedAt = typeof payload.openedAt === "number" ? payload.openedAt : 0;
  if (asString(payload.website, 200).length > 0 || (openedAt > 0 && Date.now() - openedAt < MIN_FILL_MS)) {
    return NextResponse.json({ success: true });
  }

  const submitterName = asString(payload.submitterName, 80);
  const submitterEmail = asString(payload.submitterEmail, 120);
  const name = asString(payload.name, 120);
  const region = asString(payload.region, 80);
  const description = asString(payload.description, 3000);
  const points = parsePoints(payload.points);
  const photos = Array.isArray(payload.photos)
    ? payload.photos
        .map((item) => asString((item as { src?: unknown } | null)?.src, 500))
        .filter(isOwnImageUrl)
        .slice(0, MAX_PHOTOS)
    : [];

  if (submitterName.length < 2) {
    return NextResponse.json({ error: "Podaj imię lub nick." }, { status: 400 });
  }
  if (submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
    return NextResponse.json({ error: "Niepoprawny adres e-mail." }, { status: 400 });
  }
  if (name.length < 3 || region.length < 2) {
    return NextResponse.json({ error: "Podaj nazwę trasy i region." }, { status: 400 });
  }
  if (description.length < 20) {
    return NextResponse.json({ error: "Opisz trasę (min. 20 znaków)." }, { status: 400 });
  }
  if (!points || points.length < 2) {
    return NextResponse.json({ error: "Zaznacz na mapie co najmniej 2 punkty (np. start i cel)." }, { status: 400 });
  }
  if (payload.rightsConfirmed !== true) {
    return NextResponse.json({ error: "Potwierdź prawa do zdjęć i opisu." }, { status: 400 });
  }

  const pitch = await createPitch({
    submitterName,
    submitterEmail,
    name,
    region,
    description,
    points,
    photos: photos.map((src) => ({ src })),
  });

  return NextResponse.json({ success: true, id: pitch.id }, { status: 201 });
}
