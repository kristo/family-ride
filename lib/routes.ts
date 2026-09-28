import routesData from "@/data/routes.json";
import type { Route } from "@/lib/types";

const routes = routesData as Route[];

export function getAllRoutes(): Route[] {
  return routes;
}

export function getRouteById(id: string): Route | undefined {
  return routes.find((route) => route.id === id);
}

export function getAllRouteIds(): string[] {
  return routes.map((route) => route.id);
}
