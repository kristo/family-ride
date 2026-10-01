import type { MetadataRoute } from "next";
import { getAllGuides } from "@/lib/guides";
import { getAllRoutes } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";
import { defaultPhotoStories } from "@/lib/default-photo-stories";
import { listPublishedRoutes } from "@/lib/server/community-routes";
import { listPhotoStories } from "@/lib/server/photo-stories";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [published, stories] = await Promise.all([
    listPublishedRoutes().catch(() => []),
    listPhotoStories().catch(() => []),
  ]);

  const routeIds = new Map<string, string | undefined>();
  for (const route of getAllRoutes()) {
    routeIds.set(route.id, route.verification.updatedAt);
  }
  for (const route of published) {
    routeIds.set(route.id, route.verification.updatedAt);
  }

  const storyIds = (stories.length > 0 ? stories : defaultPhotoStories).filter((story) => !story.hidden).map((story) => story.id);

  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/submit-route`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/poradniki`, changeFrequency: "weekly", priority: 0.7 },
    ...getAllGuides().map((guide) => ({
      url: `${SITE_URL}/poradniki/${guide.slug}`,
      lastModified: guide.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...[...routeIds].map(([id, updatedAt]) => ({
      url: `${SITE_URL}/routes/${id}`,
      lastModified: updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...storyIds.map((id) => ({
      url: `${SITE_URL}/stories/${id}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
