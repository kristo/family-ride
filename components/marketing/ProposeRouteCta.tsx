import Link from "next/link";

type ProposeRouteCtaProps = {
  /** "banner" - duża sekcja na stronie głównej; "compact" - mały blok pod treścią trasy. */
  variant?: "banner" | "compact";
};

export function ProposeRouteCta({ variant = "banner" }: ProposeRouteCtaProps) {
  if (variant === "compact") {
    return (
      <aside className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 md:p-8">
        <h2 className="text-xl font-bold md:text-2xl">Znasz inną fajną trasę w okolicy?</h2>
        <p className="mt-2 text-[var(--muted)]">
          Zaznacz kilka punktów na mapie i dodaj zdjęcia. My przygotujemy z tego pełną trasę.
        </p>
        <Link
          href="/zaproponuj-trase"
          className="mt-4 inline-block rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
        >
          Zaproponuj trasę
        </Link>
      </aside>
    );
  }

  return (
    <section id="zaproponuj" className="mx-auto w-full max-w-7xl px-5 pt-16 md:px-8 md:pt-24" aria-labelledby="propose-heading">
      <div className="grid gap-8 rounded-[2rem] border border-[var(--line)] bg-[var(--paper)] p-8 md:grid-cols-[1.2fr_1fr] md:items-center md:gap-14 md:p-12">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--accent-text)]">Tworzymy to razem</p>
          <h2 id="propose-heading" className="mt-2 text-3xl leading-[1.05] font-extrabold [text-wrap:balance] md:text-5xl">
            Znasz fajną trasę dla rodzin? Dodaj ją.
          </h2>
          <p className="mt-4 max-w-xl text-lg text-[var(--muted)]">
            Nie potrzebujesz śladu GPX. Wystarczy kilka punktów na mapie, parę zdjęć i krótki opis. My przygotujemy resztę i podpiszemy
            trasę Twoim imieniem.
          </p>
        </div>

        <div>
          <ol className="grid gap-3 text-sm font-semibold">
            <li className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white">1</span>
              Zaznacz na mapie start, cel i ciekawe miejsca
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white">2</span>
              Dodaj zdjęcia i kilka zdań opisu
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white">3</span>
              Przygotowujemy trasę i dajemy znać, gdy jest na stronie
            </li>
          </ol>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href="/zaproponuj-trase"
              className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white transition hover:brightness-110"
            >
              Zaproponuj trasę
            </Link>
            <Link href="/submit-route" className="text-sm font-bold text-[var(--accent-text)] underline">
              Mam gotowy ślad GPX
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
