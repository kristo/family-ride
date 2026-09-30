import type { Metadata } from "next";
import { HomeClient } from "@/components/marketing/HomeClient";
import { defaultPhotoStories } from "@/lib/default-photo-stories";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, jsonLdString } from "@/lib/site";
import { listPublishedRoutes } from "@/lib/server/community-routes";
import { listPhotoStories } from "@/lib/server/photo-stories";
import { getApprovedReviewSummaries } from "@/lib/server/route-reviews";
import type { PhotoStory, Route, RouteReviewSummary } from "@/lib/types";

// Odświeżane też na żądanie (revalidatePath) po zmianach w panelu admina.
export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Family Ride - trasy rowerowe dla rodzin z dziećmi" },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

async function safe<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch {
    return fallback;
  }
}

export default async function Home() {
  const [communityRoutes, reviewSummaries, stories] = await Promise.all([
    safe<Route[]>(listPublishedRoutes, []),
    safe<Record<string, RouteReviewSummary>>(getApprovedReviewSummaries, {}),
    safe<PhotoStory[]>(listPhotoStories, []),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "pl-PL",
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/family-ride-mark-1024.png`,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <HomeClient
        communityRoutes={communityRoutes}
        reviewSummaries={reviewSummaries}
        photoStories={stories.length > 0 ? stories : defaultPhotoStories}
      />
    </>
  );
}
