import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { list, put } from "@vercel/blob";

export type NewsletterSubscriber = {
  email: string;
  createdAt: string;
  source: string;
};

const NEWSLETTER_BLOB_PATH = "newsletter/subscribers.json";
function localNewsletterPath(): string {
  return path.join(process.cwd(), ".data", "newsletter", "subscribers.json");
}

function getBlobToken(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return token && token.trim().length > 0 ? token : null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseSubscribers(payload: unknown): NewsletterSubscriber[] {
  const subscribers = (payload as { subscribers?: unknown } | null)?.subscribers;
  if (!Array.isArray(subscribers)) {
    throw new Error("Newsletter: nieprawidłowy format listy subskrybentów.");
  }
  return subscribers as NewsletterSubscriber[];
}

// Pusta lista tylko wtedy, gdy pliku naprawdę jeszcze nie ma. Każdy inny błąd odczytu musi
// polecieć dalej - subscribeToNewsletter zapisuje całą listę, więc "[]" po chwilowej awarii
// Blob/CDN nadpisałoby wszystkich dotychczasowych subskrybentów jednym nowym adresem.
async function readSubscribers(): Promise<NewsletterSubscriber[]> {
  const token = getBlobToken();
  if (token) {
    const listed = await list({ token, prefix: NEWSLETTER_BLOB_PATH, limit: 1 });
    const blob = listed.blobs.find((item) => item.pathname === NEWSLETTER_BLOB_PATH);
    if (!blob) {
      return [];
    }

    // The Blob CDN caches this fixed URL for a month by default and ignores our
    // request-side no-store, so a fresh write can keep serving the old subscriber
    // list for up to a month. Busting with the blob's own uploadedAt (see
    // lib/server/photo-stories.ts for the same fix) gives every save a fresh
    // cache key while repeat reads of the same version still hit the cache.
    const cacheBustedUrl = `${blob.url}?v=${new Date(blob.uploadedAt).getTime()}`;
    const response = await fetch(cacheBustedUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Newsletter: odczyt listy z Blob zwrócił ${response.status}.`);
    }

    return parseSubscribers(await response.json());
  }

  let content: string;
  try {
    content = await readFile(localNewsletterPath(), "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  return parseSubscribers(JSON.parse(content));
}

async function writeSubscribers(subscribers: NewsletterSubscriber[]): Promise<void> {
  const payload = JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      subscribers,
    },
    null,
    2
  );

  const token = getBlobToken();
  if (token) {
    await put(NEWSLETTER_BLOB_PATH, payload, {
      access: "public",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
      // Defaults to a month; we also cache-bust reads by uploadedAt above, but keep this
      // short too so a direct hit of blob.url (without the query param) can't stay stale.
      cacheControlMaxAge: 60,
      token,
    });
    return;
  }

  const localPath = localNewsletterPath();
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, payload, "utf-8");
}

export async function subscribeToNewsletter(email: string, source = "homepage") {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return { status: "invalid" as const };
  }

  const existing = await readSubscribers();
  const exists = existing.some((subscriber) => normalizeEmail(subscriber.email) === normalizedEmail);
  if (exists) {
    return { status: "exists" as const };
  }

  const next = [
    {
      email: normalizedEmail,
      createdAt: new Date().toISOString(),
      source,
    },
    ...existing,
  ];

  await writeSubscribers(next);
  return { status: "subscribed" as const };
}
