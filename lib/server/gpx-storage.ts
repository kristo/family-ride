import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { list, put } from "@vercel/blob";

export type GpxListItem = {
  name: string;
  url: string;
  sizeBytes: number;
  updatedAt: string;
};

const GPX_ROOT_DIR = path.join(process.cwd(), "public", "gpx");
const GPX_UPLOADS_DIR = path.join(GPX_ROOT_DIR, "uploads");
const BLOB_PREFIX = "gpx/uploads/";

function getBlobToken(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return token && token.trim().length > 0 ? token : null;
}

export function isBlobStorageEnabled(): boolean {
  return Boolean(getBlobToken());
}

async function readLocalGpxFilesFromDirectory(directoryPath: string, urlPrefix: string): Promise<GpxListItem[]> {
  try {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    const gpxFiles = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".gpx"));

    const items = await Promise.all(
      gpxFiles.map(async (entry) => {
        const absolutePath = path.join(directoryPath, entry.name);
        const fileStat = await stat(absolutePath);

        return {
          name: entry.name,
          url: `${urlPrefix}/${entry.name}`,
          sizeBytes: fileStat.size,
          updatedAt: fileStat.mtime.toISOString(),
        } satisfies GpxListItem;
      })
    );

    return items;
  } catch {
    return [];
  }
}

async function readBlobUploads(): Promise<GpxListItem[]> {
  const token = getBlobToken();
  if (!token) {
    return [];
  }

  try {
    const response = await list({
      token,
      prefix: BLOB_PREFIX,
      limit: 1000,
    });

    return response.blobs
      .filter((blob) => blob.pathname.toLowerCase().endsWith(".gpx"))
      .map((blob) => ({
        name: blob.pathname.split("/").pop() ?? blob.pathname,
        url: blob.url,
        sizeBytes: blob.size,
        updatedAt: new Date(blob.uploadedAt).toISOString(),
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function listGpxFiles(): Promise<GpxListItem[]> {
  const localRoot = await readLocalGpxFilesFromDirectory(GPX_ROOT_DIR, "/gpx");

  if (isBlobStorageEnabled()) {
    const blobUploads = await readBlobUploads();
    return [...blobUploads, ...localRoot].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const localUploads = await readLocalGpxFilesFromDirectory(GPX_UPLOADS_DIR, "/gpx/uploads");
  return [...localUploads, ...localRoot].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveGpxFile(args: {
  fileName: string;
  content: Buffer | string;
  contentType?: string;
}): Promise<{ name: string; url: string; sizeBytes: number }> {
  const contentType = args.contentType ?? "application/gpx+xml";

  if (isBlobStorageEnabled()) {
    const token = getBlobToken();
    if (!token) {
      throw new Error("BLOB_READ_WRITE_TOKEN is missing.");
    }

    const blob = await put(`${BLOB_PREFIX}${args.fileName}`, args.content, {
      access: "public",
      addRandomSuffix: false,
      contentType,
      token,
    });

    const sizeBytes =
      typeof args.content === "string" ? Buffer.byteLength(args.content, "utf-8") : args.content.byteLength;

    return {
      name: args.fileName,
      url: blob.url,
      sizeBytes,
    };
  }

  await mkdir(GPX_UPLOADS_DIR, { recursive: true });
  const targetPath = path.join(GPX_UPLOADS_DIR, args.fileName);

  if (typeof args.content === "string") {
    await writeFile(targetPath, args.content, "utf-8");
    return {
      name: args.fileName,
      url: `/gpx/uploads/${args.fileName}`,
      sizeBytes: Buffer.byteLength(args.content, "utf-8"),
    };
  }

  await writeFile(targetPath, args.content);

  return {
    name: args.fileName,
    url: `/gpx/uploads/${args.fileName}`,
    sizeBytes: args.content.byteLength,
  };
}
