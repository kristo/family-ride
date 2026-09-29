import { NextResponse } from "next/server";
import type { PhotoStory } from "@/lib/types";
import { listPhotoStories, savePhotoStories } from "@/lib/server/photo-stories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stories = await listPhotoStories();
  return NextResponse.json({ stories });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { stories?: PhotoStory[] };
    if (!Array.isArray(payload.stories)) {
      return NextResponse.json({ error: "Niepoprawne dane Photo Stories." }, { status: 400 });
    }

    const stories = await savePhotoStories(payload.stories);
    return NextResponse.json({ success: true, stories });
  } catch (error) {
    console.error("Photo Stories save failed:", error);
    return NextResponse.json({ error: "Nie udało się zapisać Photo Stories." }, { status: 500 });
  }
}
