import { NextResponse } from "next/server";
import { listPhotoStories } from "@/lib/server/photo-stories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stories = await listPhotoStories();
  return NextResponse.json({ stories });
}
