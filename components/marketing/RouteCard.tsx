import Image from "next/image";
import Link from "next/link";
import { GpxMap } from "@/components/maps/GpxMap";
import { ArrowRightIcon, CheckIcon, ChildIcon, DownloadIcon, PlusIcon, RoadIcon, RouteIcon, StarIcon } from "@/components/ui/Icons";
import { RouteVerificationBadge } from "@/components/ui/RouteVerificationBadge";
import { gpxQualityLabel } from "@/lib/route-verification";
import type { Route } from "@/lib/types";

const PHOTO_SIZES = "(min-width: 1280px) 384px, (min-width: 768px) 50vw, 100vw";

type RouteCardProps = {
  route: Route;
  isCompared: boolean;
  compareDisabled: boolean;
  onToggleCompare: (routeId: string) => void;
};

function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function RouteCardPhoto({ src, alt }: { src: string; alt: string }) {
  if (isExternalUrl(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className="route-photo h-full w-full object-cover" loading="lazy" />;
  }

  return <Image src={src} alt={alt} fill sizes={PHOTO_SIZES} className="route-photo object-cover" />;
}

export function RouteCard({ route, isCompared, compareDisabled, onToggleCompare }: RouteCardProps) {
  const photo = route.gallery[0];
  const hasDetails = !route.id.startsWith("custom-");
  const surface = route.surfaceEstimate;
  const isUncertain = (surface?.unknownPct ?? 0) >= 30 || surface?.confidence === "low";
  const compareLabel = isCompared ? "Usuń z porównania" : compareDisabled ? "Maksymalnie 3 trasy w porównaniu" : "Dodaj do porównania";

  const title = <span className="[text-wrap:balance]">{route.name}</span>;

  return (
    <article className="route-card glass-card group relative flex flex-col overflow-hidden rounded-2xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--pine-2)]">
        {photo ? (
          <RouteCardPhoto src={photo.src} alt={photo.alt} />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--pine-2),var(--pine))]" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

        <div className="absolute left-3 top-3 rounded-full bg-[var(--paper)] shadow-sm">
          <RouteVerificationBadge level={route.verification.level} />
        </div>

        <button
          type="button"
          onClick={() => onToggleCompare(route.id)}
          disabled={!isCompared && compareDisabled}
          aria-pressed={isCompared}
          aria-label={`${compareLabel}: ${route.name}`}
          title={compareLabel}
          className={`absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full shadow-md backdrop-blur transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isCompared ? "bg-[var(--pine)] text-white" : "bg-[var(--paper)] text-[var(--ink)] hover:scale-105"
          }`}
        >
          {isCompared ? <CheckIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
        </button>

        <span className="absolute bottom-3 left-3 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {route.region}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl leading-tight font-bold">
            {hasDetails ? (
              <Link href={`/routes/${route.id}`} className="hover:text-[var(--accent-text)]">
                {title}
              </Link>
            ) : (
              title
            )}
          </h3>
          <p
            className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--ember-soft)] px-2.5 py-1 text-sm font-bold text-[var(--accent-text)]"
            aria-label={`Ocena ${route.rating} na 5${route.reviewCount ? `, ${route.reviewCount} opinii gości` : ""}`}
          >
            <StarIcon className="h-3.5 w-3.5" />
            {route.rating}
            {route.reviewCount ? <span className="font-semibold opacity-70">({route.reviewCount})</span> : null}
          </p>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">{route.description}</p>

        {route.mapEmbedUrl && (
          <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper)]">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Podgląd mapy</div>
            <div className="aspect-[16/7] border-t border-[var(--line)]">
              <GpxMap
                gpxUrl={route.gpxUrl}
                mapEmbedUrl={route.mapEmbedUrl}
                distanceKm={route.distanceKm}
                elevationM={route.elevationM}
                className="h-full w-full"
              />
            </div>
          </div>
        )}

        <dl className="grid grid-cols-3 divide-x divide-[var(--line)] rounded-xl bg-[var(--sand)] py-3 text-center">
          <div className="px-2">
            <dt className="sr-only">Dystans</dt>
            <dd className="flex flex-col items-center gap-1">
              <RouteIcon className="h-4 w-4 text-[var(--accent-2-text)]" />
              <span className="text-sm font-bold">{route.distanceKm} km</span>
            </dd>
          </div>
          <div className="px-2">
            <dt className="sr-only">Asfalt</dt>
            <dd className="flex flex-col items-center gap-1">
              <RoadIcon className="h-4 w-4 text-[var(--accent-2-text)]" />
              <span className="text-sm font-bold">{route.asphaltPct}% asfaltu</span>
            </dd>
          </div>
          <div className="px-2">
            <dt className="sr-only">Minimalny wiek</dt>
            <dd className="flex flex-col items-center gap-1">
              <ChildIcon className="h-4 w-4 text-[var(--accent-2-text)]" />
              <span className="text-sm font-bold">od {route.minAge} lat</span>
            </dd>
          </div>
        </dl>

        {isUncertain ? (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Ostrożnie: odcinki niepewne {surface?.unknownPct ?? 0}% (pewność: {surface?.confidence ?? "n/a"}).
          </p>
        ) : null}

        <ul className="flex flex-wrap gap-1.5">
          {route.attractions.slice(0, 3).map((item) => (
            <li key={item} className="rounded-full bg-[var(--mint)] px-2.5 py-1 text-xs font-semibold text-[var(--on-mint)]">
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
          <div className="min-w-0">
            {hasDetails ? (
              <Link
                href={`/routes/${route.id}`}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--accent-text)] hover:underline"
              >
                Szczegóły
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : null}
            <span className="block text-xs text-[var(--muted)]">{gpxQualityLabel(route.verification.gpxQuality)}</span>
          </div>
          <a
            href={route.gpxUrl}
            download
            className="relative z-10 inline-flex items-center gap-2 rounded-full bg-[var(--accent-2)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
          >
            <DownloadIcon className="h-4 w-4" />
            GPX
          </a>
        </div>
      </div>
    </article>
  );
}
