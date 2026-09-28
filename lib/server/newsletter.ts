import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { list, put } from "@vercel/blob";

export type NewsletterSubscriber = {
  email: string;
  createdAt: string;
  source: string;
};

const NEWSLETTER_BLOB_PATH = "newsletter/subscribers.json";
const LOCAL_NEWSLETTER_PATH = path.join(process.cwd(), ".data", "newsletter", "subscribers.json");

function getBlobToken(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return token && token.trim().length > 0 ? token : null;
}

function isBlobEnabled(): boolean {
  return Boolean(getBlobToken());
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function readSubscribers(): Promise<NewsletterSubscriber[]> {
  if (isBlobEnabled()) {
    try {
      const token = getBlobToken();
      if (!token) {
        return [];
      }

      const listed = await list({ token, prefix: NEWSLETTER_BLOB_PATH, limit: 1 });
      const blob = listed.blobs.find((item) => item.pathname === NEWSLETTER_BLOB_PATH);
      if (!blob) {
        return [];
      }

      const response = await fetch(blob.url, { cache: "no-store" });
      if (!response.ok) {
        return [];
      }

      const payload = (await response.json()) as { subscribers?: NewsletterSubscriber[] };
      return Array.isArray(payload.subscribers) ? payload.subscribers : [];
    } catch {
      return [];
    }
  }

  try {
    const content = await readFile(LOCAL_NEWSLETTER_PATH, "utf-8");
    const payload = JSON.parse(content) as { subscribers?: NewsletterSubscriber[] };
    return Array.isArray(payload.subscribers) ? payload.subscribers : [];
  } catch {
    return [];
  }
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

  if (isBlobEnabled()) {
    const token = getBlobToken();
    if (!token) {
      throw new Error("BLOB_READ_WRITE_TOKEN is missing.");
    }

    await put(NEWSLETTER_BLOB_PATH, payload, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      token,
    });
    return;
  }

  await mkdir(path.dirname(LOCAL_NEWSLETTER_PATH), { recursive: true });
  await writeFile(LOCAL_NEWSLETTER_PATH, payload, "utf-8");
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
