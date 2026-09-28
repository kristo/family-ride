import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { list, put } from "@vercel/blob";
import type { PhotoStory, PhotoStoryPhoto } from "@/lib/types";

const PHOTO_STORIES_BLOB_PATH = "photo-stories/stories.json";
const LOCAL_STORIES_PATH = path.join(process.cwd(), ".data", "photo-stories", "stories.json");

function getBlobToken(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return token && token.trim().length > 0 ? token : null;
}

function isBlobEnabled(): boolean {
  return Boolean(getBlobToken());
}

const MAX_BODY_LENGTH = 20000;
const MAX_STORY_PHOTOS = 40;

function createSummaryFromBody(body: string): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (compact.length <= 170) {
    return compact;
  }
  return `${compact.slice(0, 167).trimEnd()}...`;
}

function normalizePhotos(photos: unknown): PhotoStoryPhoto[] {
  if (!Array.isArray(photos)) {
    return [];
  }

  const result: PhotoStoryPhoto[] = [];
  for (const item of photos.slice(0, MAX_STORY_PHOTOS)) {
    const photo = item as Partial<PhotoStoryPhoto> | null;
    const src = typeof photo?.src === "string" ? photo.src.trim() : "";
    if (!src) {
      continue;
    }
    result.push({ src });
  }
  return result;
}

function normalizeStory(story: Partial<PhotoStory>, index: number): PhotoStory | null {
  const src = typeof story.src === "string" ? story.src.trim() : "";
  const title = typeof story.title === "string" ? story.title.trim() : "";
  const tag = typeof story.tag === "string" ? story.tag.trim() : "";
  const bodyRaw = typeof story.body === "string" ? story.body.trim().slice(0, MAX_BODY_LENGTH) : "";
  const legacyText = typeof story.text === "string" ? story.text.trim() : "";
  const body = bodyRaw || legacyText;
  const text = createSummaryFromBody(body);

  if (!src || !title || !tag || !body || !text) {
    return null;
  }

  const photos = normalizePhotos(story.photos);

  return {
    id: typeof story.id === "string" && story.id.trim().length > 0 ? story.id.trim() : `story-${index + 1}`,
    src,
    title,
    text,
    tag,
    ...(body ? { body } : {}),
    ...(photos.length > 0 ? { photos } : {}),
  };
}

function normalizeStories(stories: unknown): PhotoStory[] {
  if (!Array.isArray(stories)) {
    return [];
  }

  return stories
    .map((story, index) => normalizeStory(story as Partial<PhotoStory>, index))
    .filter((story) => story !== null);
}

export async function listPhotoStories(): Promise<PhotoStory[]> {
  if (isBlobEnabled()) {
    try {
      const token = getBlobToken();
      if (!token) {
        return [];
      }

      const listed = await list({ token, prefix: PHOTO_STORIES_BLOB_PATH, limit: 1 });
      const blob = listed.blobs.find((item) => item.pathname === PHOTO_STORIES_BLOB_PATH);
      if (!blob) {
        return [];
      }

      const response = await fetch(blob.url, {
        cache: "no-store",
      });

      if (!response.ok) {
        return [];
      }

      const payload = (await response.json()) as { stories?: unknown };
      return normalizeStories(payload.stories ?? []);
    } catch {
      return [];
    }
  }

  try {
    const content = await readFile(LOCAL_STORIES_PATH, "utf-8");
    const payload = JSON.parse(content) as { stories?: unknown };
    return normalizeStories(payload.stories ?? []);
  } catch {
    return [];
  }
}

export async function savePhotoStories(stories: PhotoStory[]): Promise<PhotoStory[]> {
  const normalized = normalizeStories(stories);
  const payload = {
    updatedAt: new Date().toISOString(),
    stories: normalized,
  };

  if (isBlobEnabled()) {
    const token = getBlobToken();
    if (!token) {
      throw new Error("BLOB_READ_WRITE_TOKEN is missing.");
    }

    await put(PHOTO_STORIES_BLOB_PATH, JSON.stringify(payload, null, 2), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      token,
    });

    return normalized;
  }

  await mkdir(path.dirname(LOCAL_STORIES_PATH), { recursive: true });
  await writeFile(LOCAL_STORIES_PATH, JSON.stringify(payload, null, 2), "utf-8");
  return normalized;
}
