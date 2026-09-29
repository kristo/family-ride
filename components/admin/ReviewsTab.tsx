"use client";

import { useEffect, useState } from "react";
import { StarIcon } from "@/components/ui/Icons";
import type { RouteReview } from "@/lib/types";

type ReviewsTabProps = {
  hidden: boolean;
};

export function ReviewsTab({ hidden }: ReviewsTabProps) {
  const [pendingReviews, setPendingReviews] = useState<RouteReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [reviewsMessage, setReviewsMessage] = useState<string>("");

  const loadPendingReviews = async () => {
    setReviewsLoading(true);
    try {
      const response = await fetch("/api/admin/reviews?status=pending", { method: "GET" });
      const payload = (await response.json()) as { reviews?: RouteReview[] };
      setPendingReviews(Array.isArray(payload.reviews) ? payload.reviews : []);
    } catch {
      setPendingReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadPendingReviews();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  const moderateReview = async (id: string, action: "approve" | "reject") => {
    setReviewsMessage(action === "approve" ? "Zatwierdzam ocenę..." : "Odrzucam ocenę...");

    try {
      const response = await fetch(`/api/admin/reviews/${id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewedBy: "admin" }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setReviewsMessage(payload.error ?? "Operacja moderacji nie powiodła się.");
        return;
      }

      setReviewsMessage(action === "approve" ? "Ocena zatwierdzona i widoczna na stronie." : "Ocena odrzucona.");
      await loadPendingReviews();
    } catch {
      setReviewsMessage("Operacja moderacji nie powiodła się.");
    }
  };

  return (
    <section
      id="reviews-admin"
      className={`rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_10px_34px_rgba(16,32,22,.1)] md:p-8 ${hidden ? "hidden" : ""}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Oceny gości</h2>
        <button
          type="button"
          onClick={() => void loadPendingReviews()}
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold hover:bg-black/5"
        >
          Odśwież
        </button>
      </div>

      <p className="mb-4 text-sm text-[var(--muted)]">
        Po zatwierdzeniu ocena gościa wchodzi do średniej widocznej na stronie głównej i stronie trasy
        (zastępuje wtedy ręcznie ustawioną ocenę tej trasy).
      </p>

      {reviewsMessage.length > 0 && (
        <p className="mb-3 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">{reviewsMessage}</p>
      )}

      {reviewsLoading ? (
        <p className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">Ładowanie ocen...</p>
      ) : pendingReviews.length === 0 ? (
        <p className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">Brak ocen oczekujących na moderację.</p>
      ) : (
        <ul className="grid gap-3">
          {pendingReviews.map((review) => (
            <li key={review.id} className="rounded-xl border border-[var(--line)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{review.routeName}</p>
                  <p className="mt-1 flex items-center gap-0.5 text-[var(--accent)]" aria-label={`Ocena ${review.rating} na 5`}>
                    {Array.from({ length: 5 }, (_, index) => (
                      <StarIcon key={index} className={`h-4 w-4 ${index < review.rating ? "" : "text-[var(--line)]"}`} />
                    ))}
                  </p>
                  {review.comment && <p className="mt-2 text-sm text-[var(--muted)]">{review.comment}</p>}
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {review.authorName ? `Od: ${review.authorName} · ` : ""}
                    {new Date(review.createdAt).toLocaleDateString("pl-PL")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => void moderateReview(review.id, "approve")}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900"
                  >
                    Zatwierdz
                  </button>
                  <button
                    type="button"
                    onClick={() => void moderateReview(review.id, "reject")}
                    className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900"
                  >
                    Odrzuc
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
