"use client";

import { useState, type FormEvent } from "react";
import { StarIcon } from "@/components/ui/Icons";
import type { RouteReview } from "@/lib/types";

type RouteReviewsProps = {
  routeId: string;
  routeName: string;
  initialReviews: RouteReview[];
};

type SubmitStatus = "idle" | "saving" | "ok" | "invalid" | "error";

const MAX_COMMENT_LENGTH = 1000;

function StarPicker({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Twoja ocena">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} ${star === 1 ? "gwiazdka" : "gwiazdki"}`}
          onClick={() => onChange(star)}
          className="p-0.5"
        >
          <StarIcon className={`h-7 w-7 transition ${star <= value ? "text-[var(--accent)]" : "text-[var(--line)] hover:text-[var(--accent)]/50"}`} />
        </button>
      ))}
    </div>
  );
}

export function RouteReviews({ routeId, routeName, initialReviews }: RouteReviewsProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const average =
    initialReviews.length > 0
      ? Math.round((initialReviews.reduce((sum, review) => sum + review.rating, 0) / initialReviews.length) * 10) / 10
      : null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (rating < 1) {
      setStatus("invalid");
      return;
    }

    setStatus("saving");

    try {
      const response = await fetch("/api/community/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId,
          routeName,
          rating,
          comment: comment.trim() || undefined,
          authorName: authorName.trim() || undefined,
        }),
      });

      if (!response.ok) {
        setStatus("error");
        return;
      }

      setStatus("ok");
      setRating(0);
      setComment("");
      setAuthorName("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="glass-card rounded-2xl p-5 md:p-6" aria-labelledby="route-reviews-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="route-reviews-heading" className="text-lg font-bold">
          Opinie gości
        </h3>
        {average !== null ? (
          <p className="flex items-center gap-1.5 rounded-full bg-[var(--ember-soft)] px-3 py-1 text-sm font-bold text-[var(--accent-text)]">
            <StarIcon className="h-4 w-4" />
            {average}/5 · {initialReviews.length} {initialReviews.length === 1 ? "opinia" : "opinii"}
          </p>
        ) : (
          <p className="text-sm text-[var(--muted)]">Jeszcze nikt nie ocenił tej trasy.</p>
        )}
      </div>

      {initialReviews.length > 0 && (
        <ul className="mt-4 grid gap-3">
          {initialReviews.map((review) => (
            <li key={review.id} className="rounded-xl border border-[var(--line)] bg-white/75 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-0.5 text-[var(--accent)]" aria-label={`Ocena ${review.rating} na 5`}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <StarIcon key={index} className={`h-4 w-4 ${index < review.rating ? "" : "text-[var(--line)]"}`} />
                  ))}
                </p>
                <p className="text-xs text-[var(--muted)]">{new Date(review.createdAt).toLocaleDateString("pl-PL")}</p>
              </div>
              {review.comment && <p className="mt-2 text-sm text-[var(--muted)]">{review.comment}</p>}
              {review.authorName && <p className="mt-2 text-xs font-semibold">{review.authorName}</p>}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5">
        <p className="text-sm font-semibold">Byłeś/aś na tej trasie? Oceń ją.</p>

        <StarPicker value={rating} onChange={setRating} />

        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Komentarz (opcjonalnie)</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value.slice(0, MAX_COMMENT_LENGTH))}
            className="min-h-20 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[var(--accent-2)]/25"
            placeholder="Jak było na trasie? Co warto wiedzieć przed wyjazdem z dziećmi?"
          />
        </label>

        <label className="grid max-w-xs gap-1 text-sm">
          <span className="font-semibold">Imię (opcjonalnie)</span>
          <input
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent-2)] focus:ring-2 focus:ring-[var(--accent-2)]/25"
            placeholder="Np. Kasia z dwójką dzieci"
          />
        </label>

        <button
          type="submit"
          disabled={status === "saving"}
          className="w-fit rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-70"
        >
          {status === "saving" ? "Wysyłanie..." : "Wyślij ocenę"}
        </button>

        <div aria-live="polite">
          {status === "ok" && (
            <p className="rounded-xl bg-[#e7f5e8] px-3 py-2 text-sm text-[var(--muted)]">
              Dziękujemy! Twoja opinia czeka na moderację i pojawi się po zatwierdzeniu.
            </p>
          )}
          {status === "invalid" && (
            <p className="rounded-xl bg-[#ffe9e2] px-3 py-2 text-sm text-[var(--muted)]">Wybierz liczbę gwiazdek.</p>
          )}
          {status === "error" && (
            <p className="rounded-xl bg-[#ffe9e2] px-3 py-2 text-sm text-[var(--muted)]">
              Nie udało się wysłać opinii. Spróbuj ponownie za chwilę.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
