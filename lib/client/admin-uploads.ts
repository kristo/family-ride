// Czyste funkcje pomocnicze panelu admina, bez zależności od stanu komponentu.
// Wydzielone z app/admin/page.tsx, żeby RoutesTab i PhotoStoriesTab mogły z nich
// korzystać bez duplikacji.

const NETWORK_SAFE_UPLOAD_BYTES = 4 * 1024 * 1024;
const PRIMARY_PHOTO_MAX_DIMENSION = 2200;
const SECONDARY_PHOTO_MAX_DIMENSION = 1600;

export function csvToList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function parseStravaActivityId(value: string): number | null {
  const source = value.trim();
  if (!source) {
    return null;
  }

  const directNumber = Number(source);
  if (Number.isFinite(directNumber) && directNumber > 0) {
    return directNumber;
  }

  try {
    const url = new URL(source);
    const match = url.pathname.match(/\/activities\/(\d+)/);
    if (!match) {
      return null;
    }

    const activityId = Number(match[1]);
    return Number.isFinite(activityId) && activityId > 0 ? activityId : null;
  } catch {
    return null;
  }
}

function fileNameWithJpg(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "") + ".jpg";
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

async function reencodeImage(file: File, maxDimension: number, quality: number): Promise<File | null> {
  const bitmap = await createImageBitmap(file);
  const maxSourceDimension = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, maxDimension / maxSourceDimension);

  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvasToJpegBlob(canvas, quality);
  if (!blob) {
    return null;
  }

  return new File([blob], fileNameWithJpg(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function preparePhotoForUpload(file: File): Promise<File> {
  const looksLikeHeic = /\.hei(c|f)$/i.test(file.name) || /image\/hei(c|f)/i.test(file.type);
  const mustCompress = looksLikeHeic || file.size > NETWORK_SAFE_UPLOAD_BYTES;

  if (!mustCompress) {
    return file;
  }

  const primary = await reencodeImage(file, PRIMARY_PHOTO_MAX_DIMENSION, 0.82);
  if (primary && primary.size <= NETWORK_SAFE_UPLOAD_BYTES) {
    return primary;
  }

  const secondarySource = primary ?? file;
  const secondary = await reencodeImage(secondarySource, SECONDARY_PHOTO_MAX_DIMENSION, 0.72);
  if (secondary && secondary.size <= NETWORK_SAFE_UPLOAD_BYTES) {
    return secondary;
  }

  throw new Error("Zdjęcie jest za duże do przesłania. Spróbuj mniejszy plik lub mocniejszą kompresję.");
}
