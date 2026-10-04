import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-[var(--pine)] text-white/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-12 md:flex-row md:items-start md:justify-between md:px-8">
        <div className="max-w-md">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/family-ride-mark.svg" alt="" width={36} height={36} className="h-9 w-9 rounded-[22%] ring-1 ring-white/20" />
            <span className="font-display text-lg font-bold text-white">Family Ride</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed">
            Trasy zgłaszają rodziny takie jak Ty. Każdą propozycję sprawdzamy i przygotowujemy, zanim trafi na stronę.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold" aria-label="Stopka">
          <Link href="/#trasy" className="transition hover:text-white">Trasy</Link>
          <Link href="/#stories" className="transition hover:text-white">Historie</Link>
          <Link href="/#newsletter" className="transition hover:text-white">Newsletter</Link>
          <Link href="/poradniki" className="transition hover:text-white">Poradniki</Link>
          <Link href="/zaproponuj-trase" className="transition hover:text-white">Zaproponuj trasę</Link>
          <Link href="/submit-route" className="transition hover:text-white">Dodaj trasę z GPX</Link>
        </nav>
      </div>
    </footer>
  );
}
