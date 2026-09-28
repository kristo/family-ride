"use client";

import { useState } from "react";
import { CloseIcon, ScaleIcon } from "@/components/ui/Icons";
import type { Route } from "@/lib/types";

type CompareBarProps = {
  routes: Route[];
  max: number;
  onRemove: (routeId: string) => void;
  onClear: () => void;
};

type Row = {
  label: string;
  value: (route: Route) => number;
  format: (route: Route) => string;
  best: "max" | "min" | null;
};

const rows: Row[] = [
  { label: "Region", value: () => 0, format: (route) => route.region, best: null },
  { label: "Dystans", value: (route) => route.distanceKm, format: (route) => `${route.distanceKm} km`, best: null },
  { label: "Przewyższenie", value: (route) => route.elevationM, format: (route) => `${route.elevationM} m`, best: "min" },
  { label: "Ocena", value: (route) => route.rating, format: (route) => `${route.rating} / 5`, best: "max" },
  { label: "Asfalt", value: (route) => route.asphaltPct, format: (route) => `${route.asphaltPct}%`, best: "max" },
  { label: "Wiek dziecka", value: (route) => route.minAge, format: (route) => `od ${route.minAge} lat`, best: "min" },
];

function isBest(row: Row, route: Route, routes: Route[]): boolean {
  if (!row.best || routes.length < 2) {
    return false;
  }
  const values = routes.map(row.value);
  const target = row.best === "max" ? Math.max(...values) : Math.min(...values);
  const unique = new Set(values).size > 1;
  return unique && row.value(route) === target;
}

export function CompareBar({ routes, max, onRemove, onClear }: CompareBarProps) {
  const [open, setOpen] = useState(false);

  if (routes.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="animate-sheet-up pointer-events-auto mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[var(--pine)] text-white shadow-[0_20px_60px_rgba(0,0,0,.35)]">
        {open ? (
          <div id="porownanie" className="max-h-[60vh] overflow-auto border-b border-white/10 bg-white text-[var(--ink)]">
            {routes.length < 2 ? (
              <p className="px-5 py-6 text-sm text-[var(--muted)]">Dodaj jeszcze jedną trasę, żeby zobaczyć zestawienie.</p>
            ) : (
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    <th scope="col" className="sticky left-0 bg-white px-5 py-3 font-semibold text-[var(--muted)]">
                      Porównanie
                    </th>
                    {routes.map((route) => (
                      <th key={route.id} scope="col" className="px-4 py-3 font-display text-base font-bold">
                        {route.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-b border-[var(--line)] last:border-0">
                      <th scope="row" className="sticky left-0 bg-white px-5 py-3 font-semibold text-[var(--muted)]">
                        {row.label}
                      </th>
                      {routes.map((route) => (
                        <td key={route.id} className="px-4 py-3">
                          <span
                            className={
                              isBest(row, route, routes)
                                ? "rounded-full bg-[var(--mint)] px-2.5 py-1 font-bold text-[var(--on-mint)]"
                                : "font-semibold"
                            }
                          >
                            {row.format(route)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="hidden items-center gap-2 text-sm font-semibold sm:flex">
            <ScaleIcon className="h-4 w-4 text-[var(--sun)]" />
            Porównanie {routes.length}/{max}
          </span>

          <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
            {routes.map((route) => (
              <li key={route.id} className="flex max-w-full items-center gap-1 rounded-full bg-white/10 py-1 pl-3 pr-1 text-sm">
                <span className="truncate">{route.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(route.id)}
                  aria-label={`Usuń z porównania: ${route.name}`}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full transition hover:bg-white/20"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onClear} className="rounded-full px-3 py-2 text-sm font-semibold text-white/75 transition hover:text-white">
              Wyczyść
            </button>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="porownanie"
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-bold text-white transition hover:brightness-110"
            >
              {open ? "Zwiń" : "Porównaj"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
