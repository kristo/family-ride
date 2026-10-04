import { NextResponse } from "next/server";
import { clientIp, isRateLimited } from "@/lib/server/rate-limit";
import { saveMediaFile } from "@/lib/server/media-storage";

export const runtime = "nodejs";

// Vercel ogranicza body funkcji do ok. 4,5 MB - formularz zmniejsza zdjęcia przed wysyłką.
const MAX_BYTES = 4 * 1024 * 1024;

type ImageKind = { extension: string; contentType: string };

// Rozpoznajemy typ po zawartości (magic bytes), nie po nazwie pliku - to publiczny endpoint.
function detectImage(bytes: Buffer): ImageKind | null {
  if (bytes.length > 12 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: ".jpg", contentType: "image/jpeg" };
  }
  if (bytes.length > 12 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { extension: ".png", contentType: "image/png" };
  }
  if (bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    return { extension: ".webp", contentType: "image/webp" };
  }
  return null;
}

export async function POST(request: Request) {
  if (isRateLimited(`pitch-photo:${clientIp(request)}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Zbyt wiele zdjęć w krótkim czasie. Spróbuj za godzinę." }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Brak pliku." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Zdjęcie jest za duże (limit 4 MB)." }, { status: 400 });
    }

    const content = Buffer.from(await file.arrayBuffer());
    const kind = detectImage(content);
    if (!kind) {
      return NextResponse.json({ error: "Dozwolone formaty zdjęć: JPG, PNG, WebP." }, { status: 400 });
    }

    const fileName = `pitch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${kind.extension}`;
    const saved = await saveMediaFile({ fileName, content, contentType: kind.contentType });

    return NextResponse.json({ success: true, url: saved.url });
  } catch {
    return NextResponse.json({ error: "Nie udało się wgrać zdjęcia." }, { status: 500 });
  }
}
