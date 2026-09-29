import { makeJsonBlobStore } from "@/lib/server/json-blob-store";
import type { RouteReview, RouteReviewStatus, RouteReviewSummary } from "@/lib/types";

// Ten sam wzorzec pending/approved/rejected co lib/server/community-routes.ts dla zgłoszeń
// tras: recenzja trafia do kolejki, admin ją zatwierdza albo odrzuca, a strona publiczna
// widzi tylko zatwierdzone.

const REVIEW_STATUSES: RouteReviewStatus[] = ["pending", "approved", "rejected"];
const REVIEWS_BLOB_PREFIX = "community/reviews";

const MAX_COMMENT_LENGTH = 1000;
const MAX_AUTHOR_NAME_LENGTH = 80;

const { saveJson, deleteJson, readJsonByPrefix } = makeJsonBlobStore("community");

function reviewBlobPath(status: RouteReviewStatus, id: string): string {
  return `${REVIEWS_BLOB_PREFIX}/${status}/${id}.json`;
}

function makeReviewId(routeId: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${routeId.slice(0, 24)}-${suffix}`;
}

export type CreateReviewArgs = {
  routeId: string;
  routeName: string;
  rating: number;
  comment?: string;
  authorName?: string;
};

/** Zwraca null, gdy dane wejściowe są niepoprawne (ocena poza 1-5, brak trasy itd.). */
export async function createReview(args: CreateReviewArgs): Promise<RouteReview | null> {
  const routeId = args.routeId.trim();
  const routeName = args.routeName.trim();
  const rating = Math.round(args.rating);

  if (!routeId || !routeName || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    return null;
  }

  const comment = args.comment?.trim().slice(0, MAX_COMMENT_LENGTH) || undefined;
  const authorName = args.authorName?.trim().slice(0, MAX_AUTHOR_NAME_LENGTH) || undefined;

  const now = new Date().toISOString();
  const review: RouteReview = {
    id: makeReviewId(routeId),
    routeId,
    routeName,
    status: "pending",
    rating,
    comment,
    authorName,
    createdAt: now,
    updatedAt: now,
  };

  await saveJson(reviewBlobPath("pending", review.id), review);
  return review;
}

export async function listReviews(status?: RouteReviewStatus): Promise<RouteReview[]> {
  const statuses = status ? [status] : REVIEW_STATUSES;
  const nested = await Promise.all(statuses.map((item) => readJsonByPrefix<RouteReview>(`${REVIEWS_BLOB_PREFIX}/${item}`)));

  return nested.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getReviewById(id: string): Promise<RouteReview | null> {
  const all = await listReviews();
  return all.find((item) => item.id === id) ?? null;
}

async function saveReviewWithStatus(review: RouteReview, nextStatus: RouteReviewStatus): Promise<RouteReview> {
  const next: RouteReview = {
    ...review,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };

  await saveJson(reviewBlobPath(nextStatus, review.id), next);

  for (const status of REVIEW_STATUSES) {
    if (status !== nextStatus) {
      await deleteJson(reviewBlobPath(status, review.id));
    }
  }

  return next;
}

export async function approveReview(args: { id: string; reviewedBy?: string }): Promise<RouteReview | null> {
  const existing = await getReviewById(args.id);
  if (!existing) {
    return null;
  }

  const reviewedAt = new Date().toISOString();
  return saveReviewWithStatus({ ...existing, reviewedAt, reviewedBy: args.reviewedBy ?? "admin" }, "approved");
}

export async function rejectReview(args: { id: string; reviewedBy?: string }): Promise<RouteReview | null> {
  const existing = await getReviewById(args.id);
  if (!existing) {
    return null;
  }

  const reviewedAt = new Date().toISOString();
  return saveReviewWithStatus({ ...existing, reviewedAt, reviewedBy: args.reviewedBy ?? "admin" }, "rejected");
}

/** Zatwierdzone recenzje jednej trasy, najnowsze pierwsze — do strony trasy. */
export async function getApprovedReviewsForRoute(routeId: string): Promise<RouteReview[]> {
  const approved = await listReviews("approved");
  return approved.filter((review) => review.routeId === routeId);
}

/** Średnia (zaokrąglona do 1 miejsca) i liczba zatwierdzonych recenzji, pogrupowane po trasie. */
export async function getApprovedReviewSummaries(): Promise<Record<string, RouteReviewSummary>> {
  const approved = await listReviews("approved");
  const byRoute = new Map<string, number[]>();

  for (const review of approved) {
    const ratings = byRoute.get(review.routeId) ?? [];
    ratings.push(review.rating);
    byRoute.set(review.routeId, ratings);
  }

  const summaries: Record<string, RouteReviewSummary> = {};
  for (const [routeId, ratings] of byRoute) {
    const average = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
    summaries[routeId] = { average: Math.round(average * 10) / 10, count: ratings.length };
  }

  return summaries;
}
