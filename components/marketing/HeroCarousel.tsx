"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { PhotoCredit } from "@/components/ui/PhotoCredit";

type Slide = {
  src: string;
  alt: string;
  caption: string;
};

type HeroCarouselProps = {
  slides: Slide[];
};

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  const active = slides[index] ?? slides[0];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[#fcebd8] p-3">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(240,90,36,.25),transparent_45%)]" />
      <div className="relative grid grid-cols-12 gap-2">
        <div className="relative col-span-8 aspect-[4/3] overflow-hidden rounded-xl border border-white/70">
          <Image src={active.src} alt={active.alt} fill priority className="object-cover" />
        </div>
        <div className="col-span-4 grid gap-2">
          {slides.slice(0, 2).map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative aspect-square overflow-hidden rounded-lg border ${i === index ? "border-[var(--accent)]" : "border-white/70"}`}
            >
              <Image src={slide.src} alt={slide.alt} fill className="object-cover" />
            </button>
          ))}
        </div>
      </div>
      <div className="relative mt-3 flex items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2">
        <p className="text-xs font-mono uppercase tracking-[0.14em] text-[var(--muted)]">{active.caption}</p>
        <div className="flex gap-1">
          {slides.map((slide, i) => (
            <button
              key={slide.src + i}
              type="button"
              aria-label={`Przejdz do slajdu ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2.5 w-2.5 rounded-full ${i === index ? "bg-[var(--accent)]" : "bg-[var(--line)]"}`}
            />
          ))}
        </div>
      </div>
      <PhotoCredit src={active.src} />
    </div>
  );
}
