"use client";

import { useEffect, useState } from "react";
import { POINT_KIND_LABELS } from "@/components/maps/PointPickerMapClient";
import type { PitchStatus, RoutePitch } from "@/lib/types";

const STATUS_LABELS: Record<PitchStatus, string> = {
  new: "Nowe",
  "in-progress": "W przygotowaniu",
  published: "Opublikowane",
  rejected: "Odrzucone",
};

const FILTERS: PitchStatus[] = ["new", "in-progress", "published", "rejected"];

export function PitchesPanel() {
  const [filter, setFilter] = useState<PitchStatus>("new");
  const [pitches, setPitches] = useState<RoutePitch[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async (status: PitchStatus) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/pitches?status=${status}`, { cache: "no-store" });
      const payload = (await response.json()) as { pitches?: RoutePitch[] };
      setPitches(Array.isArray(payload.pitches) ? payload.pitches : []);
    } catch {
      setPitches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void load(filter);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [filter]);

  const setStatus = async (pitch: RoutePitch, status: PitchStatus) => {
    let publishedRouteId: string | undefined;
    if (status === "published") {
      const answer = window.prompt("ID opublikowanej trasy (opcjonalnie, np. community-...):", pitch.publishedRouteId ?? "");
      if (answer === null) {
        return;
      }
      publishedRouteId = answer;
    }

    setMessage("Zapisuję...");
    try {
      const response = await fetch(`/api/admin/pitches/${pitch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, publishedRouteId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "Nie udało się zmienić statusu.");
        return;
      }
      setMessage(`Status: ${STATUS_LABELS[status]}.`);
      await load(filter);
    } catch {
      setMessage("Nie udało się zmienić statusu.");
    }
  };

  return (
    <section className="mt-8 border-t border-[var(--line)] pt-6" aria-labelledby="pitches-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="pitches-heading" className="text-2xl font-bold">
          Propozycje tras
        </h2>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${filter === status ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white hover:bg-black/5"}`}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      {message ? <p className="mb-3 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">{message}</p> : null}

      {loading ? (
        <p className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">Ładowanie propozycji...</p>
      ) : pitches.length === 0 ? (
        <p className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">Brak propozycji w tym statusie.</p>
      ) : (
        <ul className="grid gap-3">
          {pitches.map((pitch) => (
            <li key={pitch.id} className="rounded-xl border border-[var(--line)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{pitch.name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {pitch.region} | {pitch.points.length} pkt | {pitch.photos.length} zdjęć | autor: {pitch.submitterName}
                    {pitch.submitterEmail ? ` (${pitch.submitterEmail})` : ""}
                  </p>
                  <p className="text-xs text-[var(--muted)]">Wysłano: {pitch.createdAt.slice(0, 10)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setOpenId(openId === pitch.id ? null : pitch.id)} className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold hover:bg-black/5">
                    {openId === pitch.id ? "Zwiń" : "Szczegóły"}
                  </button>
                  {pitch.status !== "in-progress" ? (
                    <button type="button" onClick={() => void setStatus(pitch, "in-progress")} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
                      Przygotowuję
                    </button>
                  ) : null}
                  {pitch.status !== "published" ? (
                    <button type="button" onClick={() => void setStatus(pitch, "published")} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">
                      Opublikowana
                    </button>
                  ) : null}
                  {pitch.status !== "rejected" ? (
                    <button type="button" onClick={() => void setStatus(pitch, "rejected")} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900">
                      Odrzuć
                    </button>
                  ) : null}
                </div>
              </div>

              {openId === pitch.id ? (
                <div className="mt-4 grid gap-3 text-sm">
                  <p className="whitespace-pre-line">{pitch.description}</p>
                  <ol className="list-decimal space-y-1 pl-5">
                    {pitch.points.map((point, index) => (
                      <li key={`${point.lat}-${point.lng}-${index}`}>
                        <strong>{POINT_KIND_LABELS[point.kind]}</strong>
                        {point.label ? `: ${point.label}` : ""} —{" "}
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=15/${point.lat}/${point.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--accent-text)] underline"
                        >
                          {point.lat}, {point.lng}
                        </a>
                      </li>
                    ))}
                  </ol>
                  {pitch.photos.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                      {pitch.photos.map((photo) => (
                        <li key={photo.src}>
                          <a href={photo.src} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo.src} alt="Zdjęcie z propozycji" className="h-24 w-24 rounded-lg object-cover" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {pitch.publishedRouteId ? <p className="text-[var(--muted)]">Opublikowana jako: {pitch.publishedRouteId}</p> : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
