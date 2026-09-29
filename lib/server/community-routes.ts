import { makeJsonBlobStore } from "@/lib/server/json-blob-store";
import type { Route, RouteDraft, RouteSubmission, RouteSubmissionStatus } from "@/lib/types";

const SUBMISSION_STATUSES: RouteSubmissionStatus[] = ["pending", "approved", "rejected"];

const SUBMISSIONS_BLOB_PREFIX = "community/submissions";
const PUBLISHED_ROUTES_BLOB_PREFIX = "community/routes/published";

const { saveJson, deleteJson, readJsonByPrefix } = makeJsonBlobStore("community");

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function makeSubmissionId(name: string): string {
  const base = toSlug(name) || "trasa";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${base}-${suffix}`;
}

function makePublishedRouteId(name: string): string {
  const base = toSlug(name) || "trasa";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `community-${base}-${suffix}`;
}

function submissionBlobPath(status: RouteSubmissionStatus, id: string): string {
  return `${SUBMISSIONS_BLOB_PREFIX}/${status}/${id}.json`;
}

function publishedRouteBlobPath(routeId: string): string {
  return `${PUBLISHED_ROUTES_BLOB_PREFIX}/${routeId}.json`;
}

function draftToRoute(draft: RouteDraft, routeId: string, reviewedAt: string, createdAt?: string): Route {
  const asphaltPct = Math.max(0, Math.min(100, draft.asphaltPct));

  return {
    id: routeId,
    createdAt: createdAt ?? reviewedAt,
    name: draft.name,
    region: draft.region,
    distanceKm: draft.distanceKm,
    elevationM: draft.elevationM,
    minAge: draft.minAge,
    asphaltPct,
    gravelPct: Math.max(0, 100 - asphaltPct),
    rating: draft.rating,
    description: draft.description,
    hardestPart: draft.hardestPart,
    parking: draft.parking,
    food: draft.food,
    sleep: draft.sleep,
    attractions: draft.attractions,
    familyNote: draft.familyNote,
    gpxUrl: draft.gpxUrl,
    mapEmbedUrl: draft.mapEmbedUrl,
    videoUrl: draft.videoUrl,
    stravaUrl: draft.stravaUrl,
    bestMonths: draft.bestMonths,
    packingList: draft.packingList,
    surfaceEstimate: draft.surfaceEstimate,
    verification: {
      level: "verified",
      gpxQuality: "full-track",
      updatedAt: reviewedAt.slice(0, 10),
      note: "Trasa zgłoszona przez użytkownika i zatwierdzona przez admina.",
    },
    gallery: draft.gallery,
  };
}

function routeVerificationFromDraft(args: {
  level: Route["verification"]["level"];
  gpxUrl: string;
  reviewedAt: string;
  note?: string;
}): Route["verification"] {
  const level = args.level;
  const gpxQuality = level === "verified" ? "full-track" : args.gpxUrl.endsWith(".gpx") ? "outline" : "none";

  let note = args.note;
  if (!note || note.trim().length === 0) {
    if (level === "verified") {
      note = "Trasa zweryfikowana i opublikowana przez administratora.";
    } else if (level === "community") {
      note = "Trasa społecznościowa, zalecane sprawdzenie przed wyjazdem.";
    } else {
      note = "Wersja robocza opublikowana do dalszych testów.";
    }
  }

  return {
    level,
    gpxQuality,
    updatedAt: args.reviewedAt.slice(0, 10),
    note,
  };
}

export async function createSubmission(args: {
  submitterName: string;
  submitterEmail?: string;
  draft: RouteDraft;
}): Promise<RouteSubmission> {
  const now = new Date().toISOString();
  const id = makeSubmissionId(args.draft.name);

  const submission: RouteSubmission = {
    id,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    submitterName: args.submitterName.trim(),
    submitterEmail: args.submitterEmail?.trim() || undefined,
    draft: args.draft,
  };

  await saveJson(submissionBlobPath("pending", id), submission);
  return submission;
}

export async function listSubmissions(status?: RouteSubmissionStatus): Promise<RouteSubmission[]> {
  const statuses = status ? [status] : SUBMISSION_STATUSES;
  const nested = await Promise.all(statuses.map((item) => readJsonByPrefix<RouteSubmission>(`${SUBMISSIONS_BLOB_PREFIX}/${item}`)));

  return nested
    .flat()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSubmissionById(id: string): Promise<RouteSubmission | null> {
  const all = await listSubmissions();
  return all.find((item) => item.id === id) ?? null;
}

async function saveSubmissionWithStatus(submission: RouteSubmission, nextStatus: RouteSubmissionStatus): Promise<void> {
  const next: RouteSubmission = {
    ...submission,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };

  await saveJson(submissionBlobPath(nextStatus, submission.id), next);

  for (const status of SUBMISSION_STATUSES) {
    if (status !== nextStatus) {
      await deleteJson(submissionBlobPath(status, submission.id));
    }
  }
}

export async function approveSubmission(args: {
  id: string;
  reviewedBy?: string;
  adminNote?: string;
}): Promise<{ submission: RouteSubmission; route: Route } | null> {
  const existing = await getSubmissionById(args.id);
  if (!existing) {
    return null;
  }

  const reviewedAt = new Date().toISOString();
  const routeId = `community-${existing.id}`;
  const route = draftToRoute(existing.draft, routeId, reviewedAt);

  const approvedSubmission: RouteSubmission = {
    ...existing,
    status: "approved",
    reviewedAt,
    reviewedBy: args.reviewedBy ?? "admin",
    adminNote: args.adminNote?.trim() || undefined,
    publishedRouteId: routeId,
    updatedAt: reviewedAt,
  };

  await saveJson(publishedRouteBlobPath(routeId), route);
  await saveSubmissionWithStatus(approvedSubmission, "approved");

  return {
    submission: approvedSubmission,
    route,
  };
}

export async function createPublishedRouteFromDraft(args: {
  draft: RouteDraft;
  verificationLevel: Route["verification"]["level"];
  reviewedBy?: string;
  note?: string;
}): Promise<Route> {
  const reviewedAt = new Date().toISOString();
  const routeId = makePublishedRouteId(args.draft.name);
  const route = draftToRoute(args.draft, routeId, reviewedAt);

  route.verification = routeVerificationFromDraft({
    level: args.verificationLevel,
    gpxUrl: args.draft.gpxUrl,
    reviewedAt,
    note: args.note,
  });

  if (args.reviewedBy && args.reviewedBy.trim().length > 0) {
    route.verification.note = `${route.verification.note} (${args.reviewedBy.trim()})`;
  }

  await saveJson(publishedRouteBlobPath(routeId), route);
  return route;
}

export async function updatePublishedRouteFromDraft(args: {
  routeId: string;
  draft: RouteDraft;
  verificationLevel: Route["verification"]["level"];
  reviewedBy?: string;
  note?: string;
}): Promise<Route | null> {
  const existing = await getPublishedRouteById(args.routeId);
  if (!existing) {
    return null;
  }

  const reviewedAt = new Date().toISOString();
  const route = draftToRoute(args.draft, args.routeId, reviewedAt, existing.createdAt);

  route.verification = routeVerificationFromDraft({
    level: args.verificationLevel,
    gpxUrl: args.draft.gpxUrl,
    reviewedAt,
    note: args.note,
  });

  if (args.reviewedBy && args.reviewedBy.trim().length > 0) {
    route.verification.note = `${route.verification.note} (${args.reviewedBy.trim()})`;
  }

  await saveJson(publishedRouteBlobPath(args.routeId), route);
  return route;
}

export async function rejectSubmission(args: {
  id: string;
  reviewedBy?: string;
  adminNote?: string;
}): Promise<RouteSubmission | null> {
  const existing = await getSubmissionById(args.id);
  if (!existing) {
    return null;
  }

  const reviewedAt = new Date().toISOString();
  const rejected: RouteSubmission = {
    ...existing,
    status: "rejected",
    reviewedAt,
    reviewedBy: args.reviewedBy ?? "admin",
    adminNote: args.adminNote?.trim() || undefined,
    updatedAt: reviewedAt,
  };

  await saveSubmissionWithStatus(rejected, "rejected");
  return rejected;
}

export async function listPublishedRoutes(): Promise<Route[]> {
  const routes = await readJsonByPrefix<Route>(PUBLISHED_ROUTES_BLOB_PREFIX);
  return routes.sort((a, b) => {
    const aAddedAt = a.createdAt ?? `${a.verification.updatedAt}T00:00:00.000Z`;
    const bAddedAt = b.createdAt ?? `${b.verification.updatedAt}T00:00:00.000Z`;
    return bAddedAt.localeCompare(aAddedAt);
  });
}

export async function getPublishedRouteById(routeId: string): Promise<Route | null> {
  const routes = await listPublishedRoutes();
  return routes.find((route) => route.id === routeId) ?? null;
}

export async function getPublishedRouteIds(): Promise<string[]> {
  const routes = await listPublishedRoutes();
  return routes.map((route) => route.id);
}

export async function deletePublishedRoute(routeId: string): Promise<boolean> {
  const existing = await getPublishedRouteById(routeId);
  if (!existing) {
    return false;
  }

  await deleteJson(publishedRouteBlobPath(routeId));
  return true;
}
