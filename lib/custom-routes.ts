import type { Route } from "@/lib/types";

export const CUSTOM_ROUTES_STORAGE_KEY = "rwzd_custom_routes_v1";

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isVerification(value: unknown): value is Route["verification"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const verification = value as Partial<Route["verification"]>;

  return (
    (verification.level === "verified" || verification.level === "community" || verification.level === "draft") &&
    (verification.gpxQuality === "full-track" || verification.gpxQuality === "outline" || verification.gpxQuality === "none") &&
    isString(verification.updatedAt) &&
    isString(verification.note)
  );
}

function isSurfaceEstimate(value: unknown): value is NonNullable<Route["surfaceEstimate"]> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const estimate = value as Partial<NonNullable<Route["surfaceEstimate"]>>;

  return (
    isNumber(estimate.asphaltPct) &&
    isNumber(estimate.gravelPct) &&
    isNumber(estimate.unknownPct) &&
    (estimate.confidence === "low" || estimate.confidence === "medium" || estimate.confidence === "high") &&
    isNumber(estimate.samplesMatched) &&
    isNumber(estimate.samplesTotal) &&
    isString(estimate.note)
  );
}

function isRoute(value: unknown): value is Route {
  if (!value || typeof value !== "object") {
    return false;
  }

  const route = value as Partial<Route>;

  return (
    isString(route.id) &&
    isString(route.name) &&
    isString(route.region) &&
    isNumber(route.distanceKm) &&
    isNumber(route.elevationM) &&
    isNumber(route.minAge) &&
    isNumber(route.asphaltPct) &&
    isNumber(route.gravelPct) &&
    isNumber(route.rating) &&
    isString(route.description) &&
    isString(route.hardestPart) &&
    isString(route.parking) &&
    isString(route.food) &&
    isString(route.sleep) &&
    isStringArray(route.attractions) &&
    isString(route.familyNote) &&
    isString(route.gpxUrl) &&
    isString(route.mapEmbedUrl) &&
    (route.videoUrl === undefined || isString(route.videoUrl)) &&
    (route.stravaUrl === undefined || isString(route.stravaUrl)) &&
    isStringArray(route.bestMonths) &&
    isStringArray(route.packingList) &&
    isVerification(route.verification) &&
    (route.surfaceEstimate === undefined || isSurfaceEstimate(route.surfaceEstimate)) &&
    Array.isArray(route.gallery)
  );
}

export function readCustomRoutes(): Route[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(CUSTOM_ROUTES_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => isRoute(item));
  } catch {
    return [];
  }
}

export function saveCustomRoutes(routes: Route[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CUSTOM_ROUTES_STORAGE_KEY, JSON.stringify(routes));
}

export function makeCustomRouteId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);

  return `custom-${slug || "trasa"}-${Date.now()}`;
}
