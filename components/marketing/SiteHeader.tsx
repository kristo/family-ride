"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const links = [
  { href: "/#trasy", label: "Trasy" },
  { href: "/#stories", label: "Historie" },
  { href: "/poradniki", label: "Poradniki" },
  { href: "/#newsletter", label: "Newsletter" },
];

type SiteHeaderProps = {
  /** Na podstronach bez zdjęcia w tle nagłówek jest od razu pełny (nieprzezroczysty). */
  solid?: boolean;
};

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

const getScrolled = () => window.scrollY > 24;
const getServerScrolled = () => false;

export function SiteHeader({ solid = false }: SiteHeaderProps) {
  const scrolled = useSyncExternalStore(subscribe, getScrolled, getServerScrolled) || solid;

  return (
    <div
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled
          ? "border-b border-[var(--line)] bg-white/85 text-[var(--ink)] backdrop-blur-md"
          : "border-b border-transparent text-white"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
        <Link href={solid ? "/" : "#top"} className="flex items-center gap-2.5" aria-label="Family Ride - początek strony">
          {/* Statyczny SVG: ostry w każdej skali i bez cache optymalizatora obrazów. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/family-ride-mark.svg" alt="" width={36} height={36} className="h-9 w-9" />
          <span className="font-display text-lg font-bold tracking-tight">Family Ride</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-semibold" aria-label="Główna nawigacja">
          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 transition ${scrolled ? "hover:bg-black/5" : "hover:bg-white/15"}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <ThemeToggle className={`ml-1 ${scrolled ? "hover:bg-black/5" : "hover:bg-white/15"}`} />
          <Link
            href="/submit-route"
            className="ml-2 rounded-full bg-[var(--accent)] px-4 py-2 font-bold text-white transition hover:brightness-110"
          >
            Dodaj trasę
          </Link>
        </nav>
      </div>
    </div>
  );
}
