"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, type FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CompareBar } from "@/components/marketing/CompareBar";
import { RouteCard } from "@/components/marketing/RouteCard";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { ArrowRightIcon, SearchIcon } from "@/components/ui/Icons";
import { Photo } from "@/components/ui/Photo";
import { PhotoCredit } from "@/components/ui/PhotoCredit";
import { Reveal } from "@/components/ui/Reveal";
import { defaultPhotoStories } from "@/lib/default-photo-stories";
import { trackNewsletterSignup } from "@/lib/marketing-events";
import type { PhotoStory, Route, RouteReviewSummary } from "@/lib/types";

const ageOptions = [6, 7, 8, 9, 10, 12];
const ratingOptions = [3.5, 4, 4.3, 4.6];
const asphaltOptions = [50, 60, 70, 80];
const MAX_COMPARE = 3;
const PAGE_SIZE = 9;
// 1 wyróżniona + do tylu obok - kolejność i widoczność ustala się w panelu admina.
const MAX_SIDE_STORIES = 4;

const DEFAULT_AGE = 8;
// 0 = brak filtra domyślnie: żaden chip nie jest podświetlony, dopóki ktoś sam go nie wybierze,
// więc żadna zapisana trasa nie znika z listy bez wyraźnego działania użytkownika.
const DEFAULT_RATING = 0;
const DEFAULT_ASPHALT = 0;
const DEFAULT_SORT = "added-desc";

const heroPhoto = {
  src: "/photos/DSC_0381.jpg",
  alt: "Mama i dziecko jadą rowerami leśną drogą",
};

function routesLabel(count: number): string {
  if (count === 1) {
    return "trasa";
  }
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  return lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? "trasy" : "tras";
}

function storyLinkLabel(story: PhotoStory): string {
  const photoCount = 1 + (story.photos?.length ?? 0);
  return photoCount > 1 ? `Zobacz historię i galerię (${photoCount})` : "Zobacz historię";
}

const fieldClass =
  "h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold text-[var(--ink)] outline-none transition focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[var(--accent-2)]/25";

function HomeContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [communityRoutes, setCommunityRoutes] = useState<Route[]>([]);
  const [reviewSummaries, setReviewSummaries] = useState<Record<string, RouteReviewSummary>>({});
  const [photoStories, setPhotoStories] = useState<PhotoStory[]>(defaultPhotoStories);
  const [email, setEmail] = useState<string>("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "saving" | "ok" | "invalid" | "exists" | "error">("idle");

  useEffect(() => {
    const controller = new AbortController();

    const loadCommunityRoutes = async () => {
      try {
        const response = await fetch("/api/community/routes", {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { routes?: Route[] };
        if (Array.isArray(payload.routes)) {
          setCommunityRoutes(payload.routes);
        }
      } catch {
        // Keep UI usable even if community feed is unavailable.
      }
    };

    void loadCommunityRoutes();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadReviewSummaries = async () => {
      try {
        const response = await fetch("/api/community/reviews/summary", {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { summaries?: Record<string, RouteReviewSummary> };
        if (payload.summaries) {
          setReviewSummaries(payload.summaries);
        }
      } catch {
        // Bez opinii gości trasy po prostu pokazują ręcznie ustawioną ocenę.
      }
    };

    void loadReviewSummaries();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadPhotoStories = async () => {
      try {
        const response = await fetch("/api/photo-stories", {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { stories?: PhotoStory[] };
        if (Array.isArray(payload.stories) && payload.stories.length > 0) {
          setPhotoStories(payload.stories);
        }
      } catch {
        // Keep defaults when API is unavailable.
      }
    };

    void loadPhotoStories();

    return () => {
      controller.abort();
    };
  }, []);

  const region = searchParams.get("region") ?? "Wszystkie";
  const childAge = Number(searchParams.get("age") ?? String(DEFAULT_AGE));
  const minRating = Number(searchParams.get("rating") ?? String(DEFAULT_RATING));
  const minAsphalt = Number(searchParams.get("asphalt") ?? String(DEFAULT_ASPHALT));
  const search = searchParams.get("q") ?? "";
  const sortBy = searchParams.get("sort") ?? DEFAULT_SORT;
  const currentPage = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const compareIds = (searchParams.get("compare") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, MAX_COMPARE);

  const routes = useMemo(() => {
    // Gdy trasa ma choć jedną zatwierdzoną opinię gościa, jej średnia zastępuje ręcznie
    // ustawioną ocenę wszędzie dalej (filtr, sortowanie, karta, porównywarka) - to jedyne
    // miejsce, w którym trzeba to obsłużyć.
    return communityRoutes.map((route) => {
      const summary = reviewSummaries[route.id];
      if (!summary || summary.count === 0) {
        return route;
      }
      return { ...route, rating: summary.average, reviewCount: summary.count };
    });
  }, [communityRoutes, reviewSummaries]);

  const setQueryParams = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => {
      if (!value || value.length === 0) {
        params.delete(key);
        return;
      }
      params.set(key, value);
    });
    const query = params.toString();
    router.replace(query.length > 0 ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const regions = useMemo(() => ["Wszystkie", ...new Set(routes.map((route) => route.region))], [routes]);

  const processedRoutes = useMemo(() => {
    const filtered = routes.filter((route) => {
      const matchRegion = region === "Wszystkie" || route.region === region;
      const matchAge = route.minAge <= childAge;
      const matchRating = route.rating >= minRating;
      const matchAsphalt = route.asphaltPct >= minAsphalt;
      const searchNeedle = search.trim().toLowerCase();
      const searchableText = [
        route.name,
        route.region,
        route.description,
        route.food,
        route.parking,
        route.attractions.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      const matchSearch = searchNeedle.length === 0 || searchableText.includes(searchNeedle);
      return matchRegion && matchAge && matchRating && matchAsphalt && matchSearch;
    });

    const sorted = [...filtered];
    if (sortBy === "added-desc") {
      sorted.sort((a, b) => {
        const aAddedAt = a.createdAt ?? `${a.verification.updatedAt}T00:00:00.000Z`;
        const bAddedAt = b.createdAt ?? `${b.verification.updatedAt}T00:00:00.000Z`;
        return bAddedAt.localeCompare(aAddedAt);
      });
    }
    if (sortBy === "rating-desc") {
      sorted.sort((a, b) => b.rating - a.rating);
    }
    if (sortBy === "distance-asc") {
      sorted.sort((a, b) => a.distanceKm - b.distanceKm);
    }
    if (sortBy === "distance-desc") {
      sorted.sort((a, b) => b.distanceKm - a.distanceKm);
    }
    if (sortBy === "asphalt-desc") {
      sorted.sort((a, b) => b.asphaltPct - a.asphaltPct);
    }
    return sorted;
  }, [routes, region, childAge, minRating, minAsphalt, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(processedRoutes.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRoutes = useMemo(() => {
    const startIndex = (safePage - 1) * PAGE_SIZE;
    return processedRoutes.slice(startIndex, startIndex + PAGE_SIZE);
  }, [processedRoutes, safePage]);

  const compareRoutes = useMemo(
    () => routes.filter((route) => compareIds.includes(route.id)).slice(0, MAX_COMPARE),
    [compareIds, routes]
  );
  const visibleStories = (photoStories.length > 0 ? photoStories : defaultPhotoStories).filter((story) => !story.hidden);
  const [featuredStory, ...sideStories] = visibleStories.slice(0, 1 + MAX_SIDE_STORIES);

  const verifiedCount = routes.filter((route) => route.verification.level === "verified").length;
  const regionCount = regions.length - 1;
  const hasActiveFilters =
    region !== "Wszystkie" ||
    search.length > 0 ||
    childAge !== DEFAULT_AGE ||
    minRating !== DEFAULT_RATING ||
    minAsphalt !== DEFAULT_ASPHALT ||
    sortBy !== DEFAULT_SORT;

  const clearFilters = () =>
    setQueryParams({ region: null, age: null, rating: null, asphalt: null, q: null, sort: null, page: null });

  const goToPage = (page: number) => {
    setQueryParams({ page: String(page) });
    document.getElementById("trasy")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleCompare = (routeId: string) => {
    const nextIds = compareIds.includes(routeId)
      ? compareIds.filter((id) => id !== routeId)
      : compareIds.length >= MAX_COMPARE
        ? compareIds
        : [...compareIds, routeId];

    setQueryParams({
      compare: nextIds.length > 0 ? nextIds.join(",") : null,
    });
  };

  const submitNewsletter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    if (!isValid) {
      setNewsletterStatus("invalid");
      return;
    }

    setNewsletterStatus("saving");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalized }),
      });

      const payload = (await response.json()) as { status?: "subscribed" | "exists"; error?: string };

      if (!response.ok) {
        setNewsletterStatus(payload.error === "Podaj poprawny adres e-mail." ? "invalid" : "error");
        return;
      }

      if (payload.status === "exists") {
        setNewsletterStatus("exists");
        return;
      }

      setNewsletterStatus("ok");
      trackNewsletterSignup();
      setEmail("");
    } catch {
      setNewsletterStatus("error");
    }
  };

  return (
    <div id="top" className={`relative min-h-screen bg-[var(--sand)] text-[var(--ink)] ${compareRoutes.length > 0 ? "pb-28" : ""}`}>
      <SiteHeader />

      {/* HERO */}
      <header className="relative isolate flex min-h-[88svh] items-end overflow-hidden bg-[var(--pine)] text-white">
        <Image
          src={heroPhoto.src}
          alt={heroPhoto.alt}
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-[50%_35%]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(12,47,37,.62)_0%,rgba(12,47,37,.28)_38%,rgba(12,47,37,.9)_100%)]" />

        <div className="mx-auto w-full max-w-7xl px-5 pb-10 pt-32 md:px-8 md:pb-14">
          <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[var(--sun)]" aria-hidden="true" />
            Trasy rowerowe dla rodzin
          </p>

          <h1 className="animate-fade-up mt-5 max-w-3xl text-5xl leading-[1] font-extrabold [text-wrap:balance] md:text-7xl">
            Mniej planowania, więcej wspólnej jazdy.
          </h1>
          <p className="animate-fade-up mt-5 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">
            Sprawdzone trasy z GPX, parkingiem, jedzeniem i atrakcjami dla dzieci. Podaj wiek dziecka, a resztą zajmiemy się my.
          </p>

          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              document.getElementById("trasy")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="animate-fade-up mt-8 grid grid-cols-2 gap-3 rounded-2xl bg-white p-3 text-[var(--ink)] shadow-[0_24px_70px_rgba(0,0,0,.35)] md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-end md:p-4"
          >
            <label className="col-span-2 grid gap-1.5 md:col-span-1">
              <span className="px-1 text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Dokąd?</span>
              <span className="relative block">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setQueryParams({ q: event.target.value, page: null })}
                  placeholder="jezioro, las, Velo Dunajec…"
                  className={`${fieldClass} pl-9`}
                />
              </span>
            </label>

            <label className="grid gap-1.5">
              <span className="px-1 text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Region</span>
              <select
                value={region}
                onChange={(event) =>
                  setQueryParams({
                    region: event.target.value === "Wszystkie" ? null : event.target.value,
                    page: null,
                  })
                }
                className={fieldClass}
              >
                {regions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="px-1 text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Wiek dziecka</span>
              <select
                value={childAge}
                onChange={(event) => setQueryParams({ age: event.target.value, page: null })}
                className={fieldClass}
              >
                {ageOptions.map((age) => (
                  <option key={age} value={age}>
                    {age}+ lat
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 md:col-span-1 text-sm font-bold text-white transition hover:brightness-110"
            >
              Pokaż trasy ({processedRoutes.length})
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </form>

          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm font-semibold text-white/85">
            <li>
              {routes.length} {routesLabel(routes.length)} w bazie
            </li>
            <li>
              {regionCount} {regionCount === 1 ? "region" : regionCount <= 4 ? "regiony" : "regionów"}
            </li>
            {verifiedCount > 0 && <li>{verifiedCount} zweryfikowanych</li>}
            <li>Zdjęcia z prawdziwych wyjazdów</li>
          </ul>
        </div>
      </header>

      <main>
        {/* TRASY */}
        <section id="trasy" className="mx-auto w-full max-w-7xl px-5 pt-16 md:px-8 md:pt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-text)]">Trasy</p>
              <h2 className="mt-2 text-4xl font-extrabold md:text-5xl">Wybierz trasę na weekend</h2>
              <p className="mt-3 max-w-xl text-[var(--muted)]">
                Tylko najważniejsze informacje. Szczegóły, mapę i pełny plan wyjazdu znajdziesz po wejściu w trasę.
              </p>
            </div>
            <p className="rounded-full bg-[var(--mint)] px-4 py-1.5 text-sm font-bold text-[var(--on-mint)]" aria-live="polite">
              {processedRoutes.length} {routesLabel(processedRoutes.length)}
            </p>
          </div>

          <div className="sticky top-16 z-30 -mx-5 mt-8 border-y border-[var(--line)] bg-[var(--sand)]/95 px-5 py-3 backdrop-blur-md md:-mx-8 md:px-8">
            <div className="no-scrollbar flex items-center gap-x-6 gap-y-3 overflow-x-auto">
              <div className="flex shrink-0 items-center gap-2" role="group" aria-label="Minimalna ocena">
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Ocena</span>
                {ratingOptions.map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className="chip"
                    aria-pressed={minRating === rating}
                    onClick={() => setQueryParams({ rating: rating === DEFAULT_RATING ? null : String(rating), page: null })}
                  >
                    {rating}+
                  </button>
                ))}
              </div>

              <div className="flex shrink-0 items-center gap-2" role="group" aria-label="Minimalny asfalt">
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Asfalt</span>
                {asphaltOptions.map((asphalt) => (
                  <button
                    key={asphalt}
                    type="button"
                    className="chip"
                    aria-pressed={minAsphalt === asphalt}
                    onClick={() => setQueryParams({ asphalt: asphalt === DEFAULT_ASPHALT ? null : String(asphalt), page: null })}
                  >
                    {asphalt}%+
                  </button>
                ))}
              </div>

              <label className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Sortuj</span>
                <select
                  value={sortBy}
                  onChange={(event) => setQueryParams({ sort: event.target.value === DEFAULT_SORT ? null : event.target.value })}
                  className="chip cursor-pointer pr-2"
                >
                  <option value="added-desc">Najnowsze dodane</option>
                  <option value="rating-desc">Ocena: najwyższa</option>
                  <option value="distance-asc">Dystans: najkrótszy</option>
                  <option value="distance-desc">Dystans: najdłuższy</option>
                  <option value="asphalt-desc">Asfalt: najwięcej</option>
                </select>
              </label>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="shrink-0 rounded-full px-3 py-1.5 text-sm font-bold text-[var(--accent-text)] underline-offset-4 hover:underline"
                >
                  Wyczyść filtry
                </button>
              )}
            </div>
          </div>

          {paginatedRoutes.length > 0 ? (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {paginatedRoutes.map((route) => {
                const isCompared = compareIds.includes(route.id);
                return (
                  <RouteCard
                    key={route.id}
                    route={route}
                    isCompared={isCompared}
                    compareDisabled={compareIds.length >= MAX_COMPARE}
                    onToggleCompare={toggleCompare}
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-dashed border-[var(--line)] bg-white px-6 py-14 text-center">
              <h3 className="text-2xl font-bold">Brak tras dla tych filtrów</h3>
              <p className="mx-auto mt-2 max-w-md text-[var(--muted)]">
                Spróbuj obniżyć minimalną ocenę albo procent asfaltu, lub wybierz inny region.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-full bg-[var(--chip-on-bg)] px-6 py-3 text-sm font-bold text-[var(--chip-on-fg)] transition hover:opacity-90"
              >
                Wyczyść filtry
              </button>
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Paginacja tras">
              <button type="button" className="chip disabled:cursor-not-allowed disabled:opacity-40" disabled={safePage <= 1} onClick={() => goToPage(safePage - 1)}>
                Poprzednia
              </button>
              <span className="text-sm font-semibold text-[var(--muted)]">
                Strona {safePage} z {totalPages}
              </span>
              <button
                type="button"
                className="chip disabled:cursor-not-allowed disabled:opacity-40"
                disabled={safePage >= totalPages}
                onClick={() => goToPage(safePage + 1)}
              >
                Następna
              </button>
            </nav>
          )}
        </section>

        {/* STORIES */}
        <section id="stories" className="mt-20 bg-[var(--pine)] py-16 text-white md:mt-28 md:py-24">
          <Reveal>
            <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--sun)]">Kulisy weekendu</p>
                  <h2 className="mt-2 text-4xl font-extrabold md:text-5xl">Z naszych tras</h2>
                </div>
                <p className="max-w-md text-white/75">
                  To nie stocki. Realne kadry z tras: gdzie zwolnić, gdzie odpocząć i gdzie kończyć dzień, żeby dzieci
                  chciały wracać na rower.
                </p>
              </div>

              <div className="mt-10 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
                {featuredStory && (
                  <article className="story-feature group relative overflow-hidden rounded-3xl bg-black/20">
                    {/* Przezroczysty link na całą kartę; tytuł poniżej pozostaje właściwym linkiem dla czytników ekranu. */}
                    <Link
                      href={`/stories/${featuredStory.id}`}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="absolute inset-0 z-[1]"
                    />
                    <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[28rem]">
                      <Photo
                        src={featuredStory.src}
                        alt=""
                        sizes="(min-width: 1024px) 56vw, 100vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                        <p className="mb-3 inline-block rounded-full bg-[var(--sun)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#0c2f25]">
                          {featuredStory.tag}
                        </p>
                        <h3 className="text-3xl font-bold md:text-4xl">
                          <Link href={`/stories/${featuredStory.id}`}>{featuredStory.title}</Link>
                        </h3>
                        <p className="mt-2 max-w-xl text-white/85">{featuredStory.text}</p>
                        <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--sun)]">
                          {storyLinkLabel(featuredStory)}
                          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </p>
                        <div className="relative z-10 [&_p]:text-white/60!">
                          <PhotoCredit src={featuredStory.src} />
                        </div>
                      </div>
                    </div>
                  </article>
                )}

                <div className="grid gap-5">
                  {sideStories.map((story) => (
                    <article key={story.id} className="story-side group relative grid overflow-hidden rounded-3xl border border-white/10 bg-white/5 sm:grid-cols-[0.9fr_1.1fr]">
                      <div className="relative aspect-[4/3] overflow-hidden sm:aspect-auto sm:min-h-44">
                        <Photo
                          src={story.src}
                          alt=""
                          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 40vw, 100vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-5">
                        <p className="inline-block rounded-full border border-white/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--sun)]">
                          {story.tag}
                        </p>
                        <h3 className="mt-3 text-xl leading-tight font-bold">
                          <Link href={`/stories/${story.id}`} className="after:absolute after:inset-0 after:content-['']">
                            {story.title}
                          </Link>
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-white/75">{story.text}</p>
                        <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--sun)]">
                          {storyLinkLabel(story)}
                          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </p>
                        <div className="relative z-10 [&_p]:text-white/50!">
                          <PhotoCredit src={story.src} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* NEWSLETTER */}
        <section id="newsletter" className="mx-auto w-full max-w-7xl px-5 py-16 md:px-8 md:py-24">
          <Reveal>
            <div className="relative grid gap-8 overflow-hidden rounded-[2rem] bg-[var(--accent)] p-8 text-white md:grid-cols-2 md:items-center md:gap-14 md:p-14">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--sun)]/30" aria-hidden="true" />
              <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[var(--sun)]/40" aria-hidden="true" />

              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80">Newsletter</p>
                <h2 className="mt-2 text-4xl leading-[1.05] font-extrabold [text-wrap:balance] md:text-5xl">
                  Plan rodzinnego weekendu w skrzynce
                </h2>
                <p className="mt-4 max-w-md text-white/90">
                  Raz w tygodniu: 1 trasa, 1 GPX, 1 lista pakowania i 1 sprawdzona rekomendacja po trasie. Na start
                  dostaniesz PDF &quot;10 tras na pierwszy rodzinny sezon&quot;.
                </p>
              </div>

              <div className="relative">
                <form onSubmit={submitNewsletter} className="flex flex-col gap-3 sm:flex-row" noValidate>
                  <label className="sr-only" htmlFor="newsletter-email">
                    Adres e-mail
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setNewsletterStatus("idle");
                    }}
                    placeholder="twoj@email.pl"
                    className="h-13 w-full rounded-xl border-0 bg-white px-4 text-[var(--ink)] outline-none ring-[var(--pine)] placeholder:text-[var(--muted)] focus:ring-2"
                  />
                  <button
                    type="submit"
                    disabled={newsletterStatus === "saving"}
                    className="h-13 shrink-0 rounded-xl bg-[var(--pine)] px-6 text-sm font-bold text-white transition hover:bg-[var(--pine-2)] disabled:opacity-70"
                  >
                    {newsletterStatus === "saving" ? "Zapisywanie..." : "Zapisz mnie"}
                  </button>
                </form>

                <div aria-live="polite">
                  {newsletterStatus === "ok" && (
                    <p className="mt-3 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[var(--on-mint)]">
                      Super, jesteś na liście. Link do PDF wyślemy mailem.
                    </p>
                  )}
                  {newsletterStatus === "exists" && (
                    <p className="mt-3 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[var(--on-mint)]">
                      Ten adres jest już zapisany na newsletter.
                    </p>
                  )}
                  {newsletterStatus === "invalid" && (
                    <p className="mt-3 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[var(--accent-text)]">
                      Podaj poprawny adres e-mail.
                    </p>
                  )}
                  {newsletterStatus === "error" && (
                    <p className="mt-3 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[var(--accent-text)]">
                      Nie udało się zapisać. Spróbuj ponownie za chwilę.
                    </p>
                  )}
                </div>
                <p className="mt-3 text-xs text-white/75">Bez spamu. Wypiszesz się jednym kliknięciem.</p>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />

      <CompareBar
        routes={compareRoutes}
        max={MAX_COMPARE}
        onRemove={toggleCompare}
        onClear={() => setQueryParams({ compare: null })}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--sand)]" />}>
      <HomeContent />
    </Suspense>
  );
}
