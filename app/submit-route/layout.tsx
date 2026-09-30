import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dodaj trasę rowerową dla rodzin",
  description: "Podziel się sprawdzoną trasą rowerową dla rodzin z dziećmi. Zgłoszenia weryfikujemy przed publikacją.",
  alternates: { canonical: "/submit-route" },
};

export default function SubmitRouteLayout({ children }: LayoutProps<"/submit-route">) {
  return children;
}
