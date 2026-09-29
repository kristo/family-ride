"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ModerationTab } from "@/components/admin/ModerationTab";
import { PhotoStoriesTab } from "@/components/admin/PhotoStoriesTab";
import { ReviewsTab } from "@/components/admin/ReviewsTab";
import { RoutesTab } from "@/components/admin/RoutesTab";
import type { Route } from "@/lib/types";

export default function AdminPage() {
  const pathname = usePathname();
  const activeAdminView: "routes" | "moderation" | "stories" | "reviews" = pathname.startsWith("/admin/moderation")
    ? "moderation"
    : pathname.startsWith("/admin/stories")
      ? "stories"
      : pathname.startsWith("/admin/reviews")
        ? "reviews"
        : "routes";

  // Współdzielone między zakładką Trasy (wyświetla i edytuje) a Moderacją (odświeża po
  // zatwierdzeniu zgłoszenia) - jedyny stan, który nie mieści się w jednej zakładce.
  const [publishedRoutes, setPublishedRoutes] = useState<Route[]>([]);

  const loadPublishedRoutes = async () => {
    try {
      const response = await fetch("/api/admin/routes", { method: "GET", cache: "no-store" });
      const payload = (await response.json()) as { routes?: Route[] };
      setPublishedRoutes(Array.isArray(payload.routes) ? payload.routes : []);
    } catch {
      setPublishedRoutes([]);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadPublishedRoutes();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--sand)] px-5 py-10 text-[var(--ink)] md:px-10">
      <main className={`mx-auto grid w-full max-w-6xl gap-6 ${activeAdminView === "routes" ? "lg:grid-cols-[1.1fr_0.9fr]" : "lg:grid-cols-1"}`}>
        <section className={`rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[0_10px_34px_rgba(16,32,22,.08)] md:p-6 ${activeAdminView === "routes" ? "lg:col-span-2" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold md:text-3xl">Family Ride Admin</h1>
            <div className="flex flex-wrap gap-2">
              <Link href="/" className="rounded-xl border border-[var(--ink)] px-3 py-2 text-sm font-semibold hover:bg-black/5">
                Wróć na stronę główną
              </Link>
              <a href="/CONTENT_PLAYBOOK.md" className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold hover:bg-black/5">
                Otwórz playbook treści
              </a>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Sekcje panelu admina">
            <Link
              href="/admin/routes"
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                activeAdminView === "routes" ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white"
              }`}
            >
              Trasy
            </Link>
            <Link
              href="/admin/moderation"
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                activeAdminView === "moderation" ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white"
              }`}
            >
              Kolejka moderacji
            </Link>
            <Link
              href="/admin/stories"
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                activeAdminView === "stories" ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white"
              }`}
            >
              Photo Stories
            </Link>
            <Link
              href="/admin/reviews"
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                activeAdminView === "reviews" ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white"
              }`}
            >
              Oceny gości
            </Link>
          </div>
        </section>

        <RoutesTab
          hidden={activeAdminView !== "routes"}
          publishedRoutes={publishedRoutes}
          refreshPublishedRoutes={() => void loadPublishedRoutes()}
        />

        <ModerationTab hidden={activeAdminView !== "moderation"} onRoutesChanged={() => void loadPublishedRoutes()} />

        <ReviewsTab hidden={activeAdminView !== "reviews"} />

        <PhotoStoriesTab hidden={activeAdminView !== "stories"} />
      </main>
    </div>
  );
}
