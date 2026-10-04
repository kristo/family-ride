import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zaproponuj trasę rowerową dla rodzin",
  description:
    "Znasz fajną trasę rowerową dla rodzin? Zaznacz punkty na mapie, dodaj zdjęcia i opis - my przygotujemy z tego pełną trasę na Family Ride.",
  alternates: { canonical: "/zaproponuj-trase" },
};

export default function ProposeRouteLayout({ children }: LayoutProps<"/zaproponuj-trase">) {
  return children;
}
