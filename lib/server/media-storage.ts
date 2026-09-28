import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const MEDIA_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "media");
const BLOB_PREFIX = "media/uploads/";

function getBlobToken(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return token && token.trim().length > 0 ? token : null;
}

function isBlobStorageEnabled(): boolean {
  return Boolean(getBlobToken());
}

export async function saveMediaFile(args: {
  fileName: string;
  content: Buffer;
  contentType: string;
}): Promise<{ name: string; url: string; sizeBytes: number }> {
  if (isBlobStorageEnabled()) {
    const token = getBlobToken();
    if (!token) {
      throw new Error("BLOB_READ_WRITE_TOKEN is missing.");
    }

    const blob = await put(`${BLOB_PREFIX}${args.fileName}`, args.content, {
      access: "public",
      addRandomSuffix: false,
      contentType: args.contentType,
      token,
    });

    return {
      name: args.fileName,
      url: blob.url,
      sizeBytes: args.content.byteLength,
    };
  }

  await mkdir(MEDIA_UPLOADS_DIR, { recursive: true });
  const targetPath = path.join(MEDIA_UPLOADS_DIR, args.fileName);
  await writeFile(targetPath, args.content);

  return {
    name: args.fileName,
    url: `/uploads/media/${args.fileName}`,
    sizeBytes: args.content.byteLength,
  };
}
