import type { Route } from "@/lib/types";

export type RouteDifficultyLevel = "easy" | "medium" | "hard";

export function getRouteDifficultyLevel(route: Pick<Route, "distanceKm" | "elevationM" | "minAge">): RouteDifficultyLevel {
  const climbPerKm = route.distanceKm > 0 ? route.elevationM / route.distanceKm : 0;

  let score = 0;

  if (route.distanceKm >= 30) {
    score += 2;
  } else if (route.distanceKm >= 20) {
    score += 1;
  }

  if (climbPerKm >= 12) {
    score += 2;
  } else if (climbPerKm >= 7) {
    score += 1;
  }

  if (route.minAge >= 9) {
    score += 1;
  }

  if (score >= 4) {
    return "hard";
  }

  if (score >= 2) {
    return "medium";
  }

  return "easy";
}
