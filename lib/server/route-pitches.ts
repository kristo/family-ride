import { makeJsonBlobStore } from "@/lib/server/json-blob-store";
import type { PitchPoint, PitchStatus, RoutePitch } from "@/lib/types";

const PITCH_STATUSES: PitchStatus[] = ["new", "in-progress", "published", "rejected"];
const PITCHES_BLOB_PREFIX = "community/pitches";

const { saveJson, deleteJson, readJsonByPrefix } = makeJsonBlobStore("community");

function pitchBlobPath(status: PitchStatus, id: string): string {
  return `${PITCHES_BLOB_PREFIX}/${status}/${id}.json`;
}

function makePitchId(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "propozycja";
  return `${Date.now()}-${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createPitch(args: {
  submitterName: string;
  submitterEmail?: string;
  name: string;
  region: string;
  description: string;
  points: PitchPoint[];
  photos: { src: string }[];
}): Promise<RoutePitch> {
  const now = new Date().toISOString();
  const pitch: RoutePitch = {
    id: makePitchId(args.name),
    status: "new",
    createdAt: now,
    updatedAt: now,
    submitterName: args.submitterName,
    submitterEmail: args.submitterEmail || undefined,
    name: args.name,
    region: args.region,
    description: args.description,
    points: args.points,
    photos: args.photos,
    rightsConfirmed: true,
  };

  await saveJson(pitchBlobPath("new", pitch.id), pitch);
  return pitch;
}

export async function listPitches(status?: PitchStatus): Promise<RoutePitch[]> {
  const statuses = status ? [status] : PITCH_STATUSES;
  const nested = await Promise.all(statuses.map((item) => readJsonByPrefix<RoutePitch>(`${PITCHES_BLOB_PREFIX}/${item}`)));
  return nested.flat().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function updatePitch(args: {
  id: string;
  status: PitchStatus;
  adminNote?: string;
  publishedRouteId?: string;
}): Promise<RoutePitch | null> {
  const existing = (await listPitches()).find((item) => item.id === args.id);
  if (!existing) {
    return null;
  }

  const next: RoutePitch = {
    ...existing,
    status: args.status,
    adminNote: args.adminNote?.trim() || existing.adminNote,
    publishedRouteId: args.publishedRouteId?.trim() || existing.publishedRouteId,
    updatedAt: new Date().toISOString(),
  };

  await saveJson(pitchBlobPath(next.status, next.id), next);
  for (const status of PITCH_STATUSES) {
    if (status !== next.status) {
      await deleteJson(pitchBlobPath(status, next.id));
    }
  }
  return next;
}

export function isPitchStatus(value: unknown): value is PitchStatus {
  return typeof value === "string" && (PITCH_STATUSES as string[]).includes(value);
}
