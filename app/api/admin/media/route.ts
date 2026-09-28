import { NextResponse } from "next/server";
import { saveMediaFile } from "@/lib/server/media-storage";

export const runtime = "nodejs";

type UploadKind = "photo" | "video";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".m4v"]);
const MAX_IMAGE_SIZE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 150 * 1024 * 1024;

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function getExtension(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  if (index < 0) {
    return "";
  }
  return fileName.slice(index).toLowerCase();
}

function resolveKind(input: string | null): UploadKind | null {
  if (input === "photo" || input === "video") {
    return input;
  }
  return null;
}

function isAcceptedType(kind: UploadKind, extension: string): boolean {
  return kind === "photo" ? IMAGE_EXTENSIONS.has(extension) : VIDEO_EXTENSIONS.has(extension);
}

function getLimit(kind: UploadKind): number {
  return kind === "photo" ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
}

function inferContentType(kind: UploadKind, extension: string): string {
  if (kind === "photo") {
    if (extension === ".png") return "image/png";
    if (extension === ".webp") return "image/webp";
    if (extension === ".avif") return "image/avif";
    return "image/jpeg";
  }

  if (extension === ".webm") return "video/webm";
  if (extension === ".mov") return "video/quicktime";
  if (extension === ".m4v") return "video/x-m4v";
  return "video/mp4";
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const kind = resolveKind(url.searchParams.get("kind"));

    if (!kind) {
      return NextResponse.json({ error: "Niepoprawny typ uploadu. Uzyj kind=photo lub kind=video." }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Brak pliku do uploadu." }, { status: 400 });
    }

    const extension = getExtension(file.name);
    if (!isAcceptedType(kind, extension)) {
      const allowed = kind === "photo" ? "jpg, jpeg, png, webp, avif" : "mp4, mov, webm, m4v";
      return NextResponse.json({ error: `Niedozwolony format. Dozwolone: ${allowed}.` }, { status: 400 });
    }

    const limit = getLimit(kind);
    if (file.size > limit) {
      const limitMb = Math.round(limit / (1024 * 1024));
      return NextResponse.json({ error: `Plik jest za duży. Limit to ${limitMb} MB.` }, { status: 400 });
    }

    const content = Buffer.from(await file.arrayBuffer());
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const safeBaseName = toSlug(baseName) || kind;
    const fileName = `${Date.now()}-${safeBaseName}${extension}`;

    const saved = await saveMediaFile({
      fileName,
      content,
      contentType: file.type || inferContentType(kind, extension),
    });

    return NextResponse.json({
      success: true,
      kind,
      file: {
        name: saved.name,
        url: saved.url,
        sizeBytes: saved.sizeBytes,
      },
    });
  } catch {
    return NextResponse.json({ error: "Upload pliku nie powiódł sie." }, { status: 500 });
  }
}
