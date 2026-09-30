import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GpxMap } from "@/components/maps/GpxMap";
import { Gallery } from "@/components/ui/Gallery";
import { RouteVerificationBadge } from "@/components/ui/RouteVerificationBadge";
import { RouteReviews } from "@/components/marketing/RouteReviews";
import { getRouteDifficultyLevel } from "@/lib/route-difficulty";
import { gpxQualityLabel } from "@/lib/route-verification";
import { getPublishedRouteById, getPublishedRouteIds } from "@/lib/server/community-routes";
import { getApprovedReviewsForRoute } from "@/lib/server/route-reviews";
import { notFound } from "next/navigation";
import { getAllRouteIds, getRouteById } from "@/lib/routes";
import { SITE_NAME, SITE_URL, absoluteUrl, jsonLdString, truncateDescription } from "@/lib/site";

// Trasy z panelu admina zmieniają się bez wdrożenia; poza tym strona odświeża się na żądanie (revalidatePath).
export const revalidate = 60;

type RoutePageProps = {
  params: Promise<{ id: string }>;
};

function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function RoutePhoto({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  if (isExternalUrl(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className="h-full w-full object-cover" loading={priority ? "eager" : "lazy"} />;
  }

  return <Image src={src} alt={alt} fill className="object-cover" priority={priority} />;
}

function SurfaceBar({ asphaltPct, gravelPct }: { asphaltPct: number; gravelPct: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs font-mono text-[var(--muted)]">
        <span>Asfalt {asphaltPct}%</span>
        <span>Szuter {gravelPct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#ece3d7]">
        <div className="h-2 bg-[var(--accent)]" style={{ width: `${asphaltPct}%` }} />
      </div>
    </div>
  );
}

function InfoIcon({ kind }: { kind: "map" | "food" | "sleep" }) {
  if (kind === "map") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M8 6 3 8v10l5-2 8 2 5-2V6l-5 2-8-2Z" />
        <path d="M8 6v10M16 8v10" />
      </svg>
    );
  }
  if (kind === "food") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M7 3v8M10 3v8M8.5 11v10" />
        <path d="M16 3c2 2 2 6 0 8v10" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 12h16v6H4z" />
      <path d="M4 12V8h6a4 4 0 0 1 4 4" />
    </svg>
  );
}

export async function generateStaticParams() {
  const staticIds = getAllRouteIds();
  const communityIds = await getPublishedRouteIds();
  const uniqueIds = [...new Set([...staticIds, ...communityIds])];
  return uniqueIds.map((id) => ({ id }));
}

export async function generateMetadata({ params }: RoutePageProps): Promise<Metadata> {
  const { id } = await params;
  const route = getRouteById(id) ?? (await getPublishedRouteById(id));

  if (!route) {
    return {
      title: "Trasa nie znaleziona",
    };
  }

  const title = `${route.name} - trasa rowerowa z dziećmi (${route.region})`;
  const description = truncateDescription(route.description);
  const photo = route.gallery[0];
  const images = photo ? [{ url: absoluteUrl(photo.src), alt: photo.alt }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/routes/${route.id}` },
    openGraph: {
      title,
      description,
      type: "article",
      locale: "pl_PL",
      url: `/routes/${route.id}`,
      ...(images ? { images } : {}),
    },
    twitter: { card: "summary_large_image", title, description, ...(images ? { images: images.map((i) => i.url) } : {}) },
  };
}

export default async function RoutePage({ params }: RoutePageProps) {
  const { id } = await params;
  const route = getRouteById(id) ?? (await getPublishedRouteById(id));

  if (!route) {
    notFound();
  }

  const approvedReviews = await getApprovedReviewsForRoute(route.id);
  const reviewsAverage =
    approvedReviews.length > 0
      ? Math.round((approvedReviews.reduce((sum, review) => sum + review.rating, 0) / approvedReviews.length) * 10) / 10
      : null;
  const displayedRating = reviewsAverage ?? route.rating;

  const routeUrl = `${SITE_URL}/routes/${route.id}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: route.name, item: routeUrl },
        ],
      },
      {
        "@type": "Article",
        headline: route.name,
        description: truncateDescription(route.description, 300),
        inLanguage: "pl-PL",
        mainEntityOfPage: routeUrl,
        dateModified: route.verification.updatedAt,
        ...(route.gallery[0] ? { image: [absoluteUrl(route.gallery[0].src)] } : {}),
        author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        about: {
          "@type": "TouristAttraction",
          name: route.name,
          touristType: "Rodziny z dziećmi",
          address: { "@type": "PostalAddress", addressRegion: route.region, addressCountry: "PL" },
          ...(reviewsAverage !== null
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: reviewsAverage,
                  reviewCount: approvedReviews.length,
                  bestRating: 5,
                  worstRating: 1,
                },
              }
            : {}),
        },
      },
    ],
  };

  return (
    <div className="paper-grid relative isolate min-h-screen overflow-hidden bg-[var(--sand)] text-[var(--ink)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-[24rem] [mask-image:linear-gradient(to_bottom,black_40%,transparent)] bg-[radial-gradient(circle_at_20%_20%,rgba(240,90,36,.28),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(0,95,115,.30),transparent_50%)]" />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pb-20 pt-14 md:px-10 lg:px-14">
        <Link
          href="/"
          className="w-fit rounded-xl border border-[var(--ink)] px-3 py-2 text-sm font-semibold transition hover:bg-black/5"
        >
          Wróć do listy tras
        </Link>

        <header className="glass-card mag-shadow overflow-hidden rounded-3xl p-6 md:p-8">
          {route.gallery[0] && (
            <div className="relative -mx-6 -mt-6 mb-5 aspect-[21/8] overflow-hidden border-b border-[var(--line)] md:-mx-8 md:-mt-8">
              <RoutePhoto src={route.gallery[0].src} alt={route.gallery[0].alt} priority />
            </div>
          )}
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{route.region}</p>
          <h1 className="mt-2 text-3xl leading-tight font-bold md:text-5xl">{route.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RouteVerificationBadge level={route.verification.level} />
            <span className="rounded-full border border-[var(--line)] bg-white px-2 py-1 font-mono text-[11px] text-[var(--muted)]">
              {gpxQualityLabel(route.verification.gpxQuality)}
            </span>
            <span className="rounded-full border border-[var(--line)] bg-white px-2 py-1 font-mono text-[11px] text-[var(--muted)]">
              Aktualizacja: {route.verification.updatedAt}
            </span>
          </div>
          <p className="mt-4 max-w-3xl text-[var(--muted)]">{route.description}</p>
          <p className="mt-3 rounded-xl border border-[var(--line)] bg-white/75 px-3 py-2 text-sm text-[var(--muted)]">
            <strong>Status trasy:</strong> {route.verification.note}
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-lg bg-white/70 px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Dystans</p>
              <p className="font-bold">{route.distanceKm} km</p>
            </div>
            <div className="rounded-lg bg-white/70 px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Przewyższenie</p>
              <p className="font-bold">{route.elevationM} m</p>
            </div>
            <div className="rounded-lg bg-white/70 px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Wiek dziecka</p>
              <p className="font-bold">{route.minAge}+ lat</p>
            </div>
            <div className="rounded-lg bg-white/70 px-3 py-2">
              <p className="text-xs text-[var(--muted)]">Ocena</p>
              <p className="font-bold">
                {displayedRating} / 5{approvedReviews.length > 0 ? ` (${approvedReviews.length})` : ""}
              </p>
            </div>
          </div>

          <p className="mt-5 rounded-xl border border-[var(--line)] bg-[#fff4e8] px-3 py-2 text-sm text-[var(--muted)]">
            <strong>Notatka rodzica:</strong> {route.familyNote}
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="glass-card rounded-2xl p-5">
            <h2 className="text-xl font-bold">Nawierzchnia i odcinek krytyczny</h2>
            <div className="mt-4 rounded-xl border border-[var(--line)] bg-white/70 p-3">
              <SurfaceBar asphaltPct={route.asphaltPct} gravelPct={route.gravelPct} />
            </div>

            {route.surfaceEstimate && (
              <div className="mt-3 rounded-xl border border-[var(--line)] bg-white/75 px-3 py-2 text-sm text-[var(--muted)]">
                <p>
                  <strong className="text-[var(--ink)]">Pewność estymacji OSM:</strong> {route.surfaceEstimate.confidence}
                  {" • "}
                  niepewne odcinki: {route.surfaceEstimate.unknownPct}%
                </p>
                <p className="mt-1 text-xs">{route.surfaceEstimate.note}</p>
              </div>
            )}

            {(route.surfaceEstimate?.unknownPct ?? 0) >= 30 && (
              <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Uwaga: duży udział odcinków o niepewnej nawierzchni. Warto potwierdzić trasę lokalnie przed wyjazdem z dziećmi.
              </p>
            )}

            <p className="mt-4 text-sm text-[var(--muted)]">
              <strong className="text-[var(--ink)]">Najtrudniejszy fragment:</strong> {route.hardestPart}
            </p>

            <div className="mt-5 overflow-hidden rounded-xl border border-[var(--line)]">
              <div className="h-72 w-full">
                <GpxMap
                  gpxUrl={route.gpxUrl}
                  mapEmbedUrl={route.mapEmbedUrl}
                  distanceKm={route.distanceKm}
                  elevationM={route.elevationM}
                  difficultyLevel={getRouteDifficultyLevel(route)}
                />
              </div>
            </div>

            <a
              href={route.gpxUrl}
              download
              className="mt-4 inline-block rounded-xl bg-[var(--accent-2)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
            >
              Pobierz GPX trasy
            </a>

            {route.stravaUrl && (
              <a
                href={route.stravaUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-black/5"
              >
                Zobacz aktywność na Strava
              </a>
            )}

            {route.verification.gpxQuality !== "full-track" && (
              <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Uwaga: aktualny GPX jest szkicem przebiegu. Przed wyjazdem sprawdź przebieg i nawierzchnię.
              </p>
            )}

            <div className="mt-6">
              <h3 className="text-lg font-bold">Galeria trasy</h3>
              <div className="mt-3">
                <Gallery
                  photos={route.gallery.map((photo) => ({ src: photo.src, alt: photo.alt, caption: photo.caption }))}
                />
              </div>
            </div>

            {route.videoUrl && (
              <div className="mt-6">
                <h3 className="text-lg font-bold">Wideo z przejazdu</h3>
                <div className="mt-3 overflow-hidden rounded-xl border border-[var(--line)] bg-black">
                  <video src={route.videoUrl} controls className="h-full max-h-[26rem] w-full" preload="metadata" />
                </div>
              </div>
            )}
          </article>

          <aside className="grid gap-4">
            <article className="glass-card rounded-2xl p-5">
              <h3 className="text-lg font-bold">Plan dnia</h3>
              <p className="mt-3 text-sm text-[var(--muted)]">
                <span className="mr-2 inline-flex align-middle text-[var(--accent-2)]"><InfoIcon kind="map" /></span>
                <strong>Parking:</strong> {route.parking}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                <span className="mr-2 inline-flex align-middle text-[var(--accent-2)]"><InfoIcon kind="food" /></span>
                <strong>Jedzenie:</strong> {route.food}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                <span className="mr-2 inline-flex align-middle text-[var(--accent-2)]"><InfoIcon kind="sleep" /></span>
                <strong>Nocleg:</strong> {route.sleep}
              </p>
            </article>

            <article className="glass-card rounded-2xl p-5">
              <h3 className="text-lg font-bold">Atrakcje wokół</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {route.attractions.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 font-mono text-[11px] text-[var(--muted)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="glass-card rounded-2xl p-5">
              <h3 className="text-lg font-bold">Kiedy najlepiej jechać</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {route.bestMonths.map((month) => (
                  <li
                    key={month}
                    className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 font-mono text-[11px] text-[var(--muted)]"
                  >
                    {month}
                  </li>
                ))}
              </ul>
            </article>

            <article className="glass-card rounded-2xl p-5">
              <h3 className="text-lg font-bold">Co spakować</h3>
              <ul className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
                {route.packingList.map((item) => (
                  <li key={item} className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </aside>
        </section>

        <RouteReviews routeId={route.id} routeName={route.name} initialReviews={approvedReviews} />
      </main>
    </div>
  );
}
