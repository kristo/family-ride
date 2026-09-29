import { NextResponse } from "next/server";
import { buildOsmEmbedUrl, extractLatLngFromGpxText } from "@/lib/server/gpx-bbox";
import { listGpxFiles, saveGpxFile } from "@/lib/server/gpx-storage";

export const runtime = "nodejs";

type GpxListItem = {
  name: string;
  url: string;
  sizeBytes: number;
  updatedAt: string;
};

const MAX_GPX_SIZE_BYTES = 5 * 1024 * 1024;

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function isGpxPayload(content: string): boolean {
  const normalized = content.toLowerCase();
  return normalized.includes("<gpx") && normalized.includes("</gpx>");
}

export async function GET() {
  const files = (await listGpxFiles()) as GpxListItem[];

  return NextResponse.json({ files });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Brak pliku do uploadu." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".gpx")) {
      return NextResponse.json({ error: "Dozwolone sa tylko pliki .gpx" }, { status: 400 });
    }

    if (file.size > MAX_GPX_SIZE_BYTES) {
      return NextResponse.json({ error: "Plik jest za duży. Limit to 5 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const content = buffer.toString("utf-8");

    if (!isGpxPayload(content)) {
      return NextResponse.json({ error: "Plik nie wyglada na poprawny GPX." }, { status: 400 });
    }

    const originalBaseName = file.name.replace(/\.gpx$/i, "");
    const safeBaseName = toSlug(originalBaseName) || "trasa";
    const storedName = `${Date.now()}-${safeBaseName}.gpx`;
    const saved = await saveGpxFile({
      fileName: storedName,
      content: buffer,
      contentType: file.type || "application/gpx+xml",
    });

    const mapEmbedUrl = buildOsmEmbedUrl(extractLatLngFromGpxText(content));

    return NextResponse.json({
      success: true,
      file: {
        name: saved.name,
        url: saved.url,
        sizeBytes: saved.sizeBytes,
      },
      mapEmbedUrl,
    });
  } catch {
    return NextResponse.json({ error: "Nie udało się zapisac pliku GPX." }, { status: 500 });
  }
}
