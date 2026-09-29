import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, list, put } from "@vercel/blob";

// Magazyn wielu obiektów JSON pod prefiksem ścieżki, w Vercel Blob (produkcja) albo
// w lokalnych plikach pod .data/<namespace> (dev bez tokenu Blob). Wydzielony z
// community-routes.ts, żeby lib/server/route-reviews.ts mógł użyć dokładnie tej samej,
// już sprawdzonej logiki (włącznie z poprawką na cache CDN) zamiast kopiować ją po raz drugi.

function getBlobToken(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return token && token.trim().length > 0 ? token : null;
}

function isBlobEnabled(): boolean {
  return Boolean(getBlobToken());
}

export function makeJsonBlobStore(namespace: string) {
  const localRootDir = path.join(process.cwd(), ".data", namespace);

  async function saveJson(pathname: string, payload: unknown) {
    const content = JSON.stringify(payload, null, 2);

    if (isBlobEnabled()) {
      const token = getBlobToken();
      if (!token) {
        throw new Error("BLOB_READ_WRITE_TOKEN is missing.");
      }

      await put(pathname, content, {
        access: "public",
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "application/json",
        // Defaults to a month; we also cache-bust reads by uploadedAt below, but keep this
        // short too so a direct hit of blob.url (without the query param) can't stay stale.
        cacheControlMaxAge: 60,
        token,
      });
      return;
    }

    const absolutePath = path.join(localRootDir, pathname);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf-8");
  }

  async function deleteJson(pathname: string) {
    if (isBlobEnabled()) {
      const token = getBlobToken();
      if (!token) {
        return;
      }

      try {
        await del(pathname, { token });
      } catch {
        // Ignore deletes for missing blobs.
      }
      return;
    }

    const absolutePath = path.join(localRootDir, pathname);
    try {
      await rm(absolutePath);
    } catch {
      // Ignore deletes for missing files.
    }
  }

  async function readJsonFromBlobPrefix<T>(prefix: string): Promise<T[]> {
    const token = getBlobToken();
    if (!token) {
      return [];
    }

    try {
      const response = await list({ token, prefix, limit: 1000 });

      const values = await Promise.all(
        response.blobs
          .filter((blob) => blob.pathname.toLowerCase().endsWith(".json"))
          .map(async (blob) => {
            // Fixed-pathname blobs are cached by the CDN for a month by default and ignore
            // our request-side no-store; bust with the blob's own uploadedAt so a fresh
            // save/approve/reject isn't served stale (see memory: blob-json-cdn-cache-stale-reads).
            const cacheBustedUrl = `${blob.url}?v=${new Date(blob.uploadedAt).getTime()}`;
            const fetchResponse = await fetch(cacheBustedUrl, { cache: "no-store" });
            if (!fetchResponse.ok) {
              return null;
            }
            return (await fetchResponse.json()) as T;
          })
      );

      return values.filter((item) => item !== null) as T[];
    } catch {
      return [];
    }
  }

  async function readJsonFromLocalPrefix<T>(prefix: string): Promise<T[]> {
    const absolutePrefix = path.join(localRootDir, prefix);

    try {
      const entries = await readdir(absolutePrefix, { withFileTypes: true });
      const files = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"));

      const values = await Promise.all(
        files.map(async (entry) => {
          const content = await readFile(path.join(absolutePrefix, entry.name), "utf-8");
          return JSON.parse(content) as T;
        })
      );

      return values;
    } catch {
      return [];
    }
  }

  async function readJsonByPrefix<T>(prefix: string): Promise<T[]> {
    if (isBlobEnabled()) {
      return readJsonFromBlobPrefix<T>(prefix);
    }
    return readJsonFromLocalPrefix<T>(prefix);
  }

  return { saveJson, deleteJson, readJsonByPrefix };
}
