"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRightIcon, CloseIcon } from "@/components/ui/Icons";
import { Photo } from "@/components/ui/Photo";
import { PhotoCredit } from "@/components/ui/PhotoCredit";

export type GalleryPhoto = {
  src: string;
  alt: string;
  caption?: string;
};

type GalleryProps = {
  photos: GalleryPhoto[];
};

const SWIPE_THRESHOLD_PX = 50;

function tileClass(index: number, total: number): string {
  const base = "group relative overflow-hidden rounded-2xl bg-[var(--surface-2)]";
  if (total === 1) {
    return `${base} aspect-[16/9]`;
  }
  if (total === 2) {
    return `${base} aspect-[4/3]`;
  }
  // 3+ zdjęć: na desktopie wysokość wyznacza siatka (auto-rows), pierwsze zdjęcie zajmuje 2x2.
  const size = index === 0 ? "md:col-span-2 md:row-span-2" : "";
  return `${base} aspect-[4/3] md:aspect-auto ${size}`.trim();
}

function gridClass(total: number): string {
  if (total === 1) {
    return "grid gap-3";
  }
  if (total === 2) {
    return "grid gap-3 md:grid-cols-2";
  }
  return "grid gap-3 md:grid-cols-3 md:auto-rows-[13rem] lg:auto-rows-[15rem]";
}

export function Gallery({ photos }: GalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const total = photos.length;
  const isOpen = openIndex !== null;

  const close = useCallback(() => {
    setOpenIndex(null);
    openerRef.current?.focus();
  }, []);

  const step = useCallback(
    (direction: 1 | -1) => {
      setOpenIndex((current) => (current === null ? current : (current + direction + total) % total));
    },
    [total]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      } else if (event.key === "ArrowRight") {
        step(1);
      } else if (event.key === "ArrowLeft") {
        step(-1);
      } else if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]");
        if (!focusable || focusable.length === 0) {
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, close, step]);

  // Doładowanie sąsiednich zdjęć, żeby przewijanie było płynne.
  useEffect(() => {
    if (openIndex === null || total < 2) {
      return;
    }
    for (const offset of [1, -1]) {
      const neighbour = photos[(openIndex + offset + total) % total];
      if (neighbour && /^https?:\/\//i.test(neighbour.src)) {
        const preload = new window.Image();
        preload.src = neighbour.src;
      }
    }
  }, [openIndex, photos, total]);

  if (total === 0) {
    return null;
  }

  const active = openIndex !== null ? photos[openIndex] : null;

  return (
    <>
      <div className={gridClass(total)}>
        {photos.map((photo, index) => (
          <button
            key={`${photo.src}-${index}`}
            type="button"
            onClick={(event) => {
              openerRef.current = event.currentTarget;
              setOpenIndex(index);
            }}
            aria-label={`Powiększ zdjęcie ${index + 1} z ${total}: ${photo.alt}`}
            className={tileClass(index, total)}
          >
            <Photo
              src={photo.src}
              alt={photo.alt}
              sizes={index === 0 ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 33vw, 100vw"}
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority={index === 0}
            />
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            {photo.caption ? (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-3 text-left text-sm font-semibold text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                {photo.caption}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-2 grid gap-0.5">
        {photos.map((photo, index) => (
          <PhotoCredit key={`credit-${photo.src}-${index}`} src={photo.src} className="mt-0!" />
        ))}
      </div>

      {active && openIndex !== null ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Galeria zdjęć"
          className="fixed inset-0 z-[70] flex flex-col bg-black/95 text-white"
          onClick={close}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touchStartX.current;
            touchStartX.current = null;
            const end = event.changedTouches[0]?.clientX;
            if (start === null || end === undefined || total < 2) {
              return;
            }
            const delta = end - start;
            if (Math.abs(delta) > SWIPE_THRESHOLD_PX) {
              step(delta < 0 ? 1 : -1);
            }
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            <p className="text-sm font-semibold text-white/80" aria-live="polite">
              {openIndex + 1} / {total}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                close();
              }}
              aria-label="Zamknij galerię"
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0 px-2 md:px-20" onClick={(event) => event.stopPropagation()}>
              <div className="relative h-full w-full">
                <Photo
                  key={active.src}
                  src={active.src}
                  alt={active.alt}
                  sizes="100vw"
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {total > 1 ? (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    step(-1);
                  }}
                  aria-label="Poprzednie zdjęcie"
                  className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition hover:bg-white/25 md:left-6"
                >
                  <ArrowRightIcon className="h-5 w-5 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    step(1);
                  }}
                  aria-label="Następne zdjęcie"
                  className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition hover:bg-white/25 md:right-6"
                >
                  <ArrowRightIcon className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>

          <div className="min-h-16 px-4 py-3 text-center md:px-6" onClick={(event) => event.stopPropagation()}>
            {active.caption ? <p className="text-sm text-white/90 md:text-base">{active.caption}</p> : null}
            <div className="[&_a]:text-white/70 [&_p]:text-white/60!">
              <PhotoCredit src={active.src} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
