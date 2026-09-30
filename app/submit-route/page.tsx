"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { RouteDraft, RouteSurfaceEstimate } from "@/lib/types";
import { VOIVODESHIPS } from "@/lib/voivodeships";

type StravaStatus = {
  configured: boolean;
  connected: boolean;
  athlete?: {
    firstname?: string;
    username?: string;
  };
};

type DraftFormState = {
  submitterName: string;
  submitterEmail: string;
  name: string;
  region: string;
  description: string;
  hardestPart: string;
  parking: string;
  food: string;
  sleep: string;
  familyNote: string;
  attractionsCsv: string;
  bestMonthsCsv: string;
  packingListCsv: string;
  gpxUrl: string;
  mapEmbedUrl: string;
  stravaUrl: string;
  videoUrl: string;
  photoUrlsCsv: string;
  distanceKm: string;
  elevationM: string;
  minAge: string;
  asphaltPct: string;
  rating: string;
};

const initialForm: DraftFormState = {
  submitterName: "",
  submitterEmail: "",
  name: "",
  region: "",
  description: "",
  hardestPart: "",
  parking: "",
  food: "",
  sleep: "",
  familyNote: "",
  attractionsCsv: "",
  bestMonthsCsv: "maj,czerwiec,wrzesień",
  packingListCsv: "kask,bidony,zapasowa detka",
  gpxUrl: "",
  mapEmbedUrl: "https://www.openstreetmap.org/export/embed.html?bbox=19.0%2C49.0%2C20.0%2C50.0&layer=mapnik",
  stravaUrl: "",
  videoUrl: "",
  photoUrlsCsv: "",
  distanceKm: "",
  elevationM: "",
  minAge: "7",
  asphaltPct: "70",
  rating: "4.2",
};

function csvToList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseStravaActivityId(value: string): number | null {
  const source = value.trim();
  if (!source) {
    return null;
  }

  const direct = Number(source);
  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  try {
    const url = new URL(source);
    const match = url.pathname.match(/\/activities\/(\d+)/);
    if (!match) {
      return null;
    }
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export default function SubmitRoutePage() {
  const [form, setForm] = useState<DraftFormState>(initialForm);
  const [stravaStatus, setStravaStatus] = useState<StravaStatus>({ configured: false, connected: false });
  const [stravaMessage, setStravaMessage] = useState<string>("");
  const [mediaMessage, setMediaMessage] = useState<string>("");
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState<string>("");
  const [surfaceEstimate, setSurfaceEstimate] = useState<RouteSurfaceEstimate | null>(null);

  const canSubmit = useMemo(() => {
    return (
      form.submitterName.trim().length > 1 &&
      form.name.trim().length > 2 &&
      form.region.trim().length > 1 &&
      form.description.trim().length > 10 &&
      form.gpxUrl.trim().length > 0
    );
  }, [form]);

  const loadStravaStatus = async () => {
    try {
      const response = await fetch("/api/admin/strava/status", { method: "GET" });
      const payload = (await response.json()) as StravaStatus;
      setStravaStatus(payload);
    } catch {
      setStravaStatus({ configured: false, connected: false });
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadStravaStatus();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  const connectStrava = async () => {
    try {
      const response = await fetch("/api/admin/strava/connect", { method: "GET" });
      const payload = (await response.json()) as { authUrl?: string; error?: string };
      if (!response.ok || !payload.authUrl) {
        setStravaMessage(payload.error ?? "Nie udało się uruchomić połączenia Strava.");
        return;
      }
      window.location.href = payload.authUrl;
    } catch {
      setStravaMessage("Nie udało się uruchomić połączenia Strava.");
    }
  };

  const importFromStrava = async () => {
    const activityId = parseStravaActivityId(form.stravaUrl);
    if (!activityId) {
      setStravaMessage("Podaj poprawny link Strava (lub samo ID aktywności).");
      return;
    }

    setStravaMessage("Importuje aktywność...");

    try {
      const response = await fetch("/api/admin/strava/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId }),
      });

      const payload = (await response.json()) as {
        error?: string;
        file?: { url?: string; name?: string };
        activity?: { name?: string };
        metrics?: { distanceKm?: number; elevationM?: number };
        surface?: RouteSurfaceEstimate | null;
      };

      if (!response.ok || !payload.file?.url) {
        setStravaMessage(payload.error ?? "Import nie powiódł się.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        gpxUrl: payload.file?.url ?? prev.gpxUrl,
        name: prev.name.trim().length > 0 ? prev.name : (payload.activity?.name ?? prev.name),
        distanceKm: typeof payload.metrics?.distanceKm === "number" ? String(payload.metrics.distanceKm) : prev.distanceKm,
        elevationM: typeof payload.metrics?.elevationM === "number" ? String(payload.metrics.elevationM) : prev.elevationM,
        asphaltPct: typeof payload.surface?.asphaltPct === "number" ? String(payload.surface.asphaltPct) : prev.asphaltPct,
      }));

      setSurfaceEstimate(payload.surface ?? null);
      setStravaMessage(`Zaimportowano GPX: ${payload.file.name ?? "plik"}.`);
    } catch {
      setStravaMessage("Import nie powiódł się.");
    }
  };

  const uploadFile = async (kind: "photo" | "video" | "gpx", file: File) => {
    setMediaMessage("Wgrywanie pliku...");

    try {
      if (kind === "gpx") {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/admin/gpx", { method: "POST", body });
        const payload = (await response.json()) as {
          error?: string;
          file?: { url?: string; name?: string };
          mapEmbedUrl?: string | null;
        };

        if (!response.ok || !payload.file?.url) {
          setMediaMessage(payload.error ?? "Upload GPX nie powiódł się.");
          return;
        }

        setForm((prev) => ({
          ...prev,
          gpxUrl: payload.file?.url ?? prev.gpxUrl,
          mapEmbedUrl: payload.mapEmbedUrl ?? prev.mapEmbedUrl,
        }));
        setMediaMessage(`Dodano GPX: ${payload.file.name ?? "plik"}`);
        return;
      }

      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/admin/media?kind=${kind}`, {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as { error?: string; file?: { url?: string; name?: string } };

      if (!response.ok || !payload.file?.url) {
        setMediaMessage(payload.error ?? "Upload pliku nie powiódł się.");
        return;
      }

      if (kind === "photo") {
        setForm((prev) => ({
          ...prev,
          photoUrlsCsv: prev.photoUrlsCsv.trim().length > 0 ? `${prev.photoUrlsCsv}, ${payload.file?.url}` : (payload.file?.url ?? ""),
        }));
      } else {
        setForm((prev) => ({ ...prev, videoUrl: payload.file?.url ?? prev.videoUrl }));
      }

      setMediaMessage(`Dodano plik: ${payload.file.name ?? "plik"}`);
    } catch {
      setMediaMessage("Upload pliku nie powiódł się.");
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const draft: RouteDraft = {
      name: form.name.trim(),
      region: form.region.trim(),
      distanceKm: Number(form.distanceKm),
      elevationM: Number(form.elevationM),
      minAge: Number(form.minAge),
      asphaltPct: Number(form.asphaltPct),
      rating: Number(form.rating),
      description: form.description.trim(),
      hardestPart: form.hardestPart.trim(),
      parking: form.parking.trim(),
      food: form.food.trim(),
      sleep: form.sleep.trim(),
      attractions: csvToList(form.attractionsCsv),
      familyNote: form.familyNote.trim(),
      gpxUrl: form.gpxUrl.trim(),
      mapEmbedUrl: form.mapEmbedUrl.trim(),
      stravaUrl: form.stravaUrl.trim() || undefined,
      videoUrl: form.videoUrl.trim() || undefined,
      bestMonths: csvToList(form.bestMonthsCsv),
      packingList: csvToList(form.packingListCsv),
      surfaceEstimate: surfaceEstimate ?? undefined,
      gallery: csvToList(form.photoUrlsCsv).map((url, index) => ({
        src: url,
        alt: `${form.name.trim() || "Trasa"} - zdjęcie ${index + 1}`,
        caption: `Kadr ${index + 1} z trasy`,
      })),
    };

    setSubmitState("saving");
    setSubmitMessage("Zapisuję zgłoszenie...");

    try {
      const response = await fetch("/api/community/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: form.submitterName,
          submitterEmail: form.submitterEmail,
          draft,
        }),
      });

      const payload = (await response.json()) as { error?: string; submission?: { id: string } };

      if (!response.ok || !payload.submission?.id) {
        setSubmitState("error");
        setSubmitMessage(payload.error ?? "Nie udało się wysłać trasy.");
        return;
      }

      setSubmitState("ok");
      setSubmitMessage(`Dzięki! Zgłoszenie zapisane (ID: ${payload.submission.id}). Po weryfikacji admina trasa trafi na listę publiczną.`);
      setForm(initialForm);
      setSurfaceEstimate(null);
    } catch {
      setSubmitState("error");
      setSubmitMessage("Nie udało się wysłać trasy.");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sand)] px-5 py-10 text-[var(--ink)] md:px-10">
      <main className="mx-auto w-full max-w-4xl rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_10px_34px_rgba(16,32,22,.1)] md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold md:text-4xl">Dodaj trasę społeczności</h1>
          <Link href="/" className="rounded-xl border border-[var(--ink)] px-3 py-2 text-sm font-semibold hover:bg-black/5">
            Wróć na główna
          </Link>
        </div>

        <p className="mt-3 text-sm text-[var(--muted)]">
          Dodaj swoją trasę ze Stravy i materiały. Zgłoszenie trafi do kolejki moderacji i po akceptacji pojawi się publicznie.
        </p>

        <div className="mt-5 rounded-xl border border-[var(--line)] bg-white p-4">
          <p className="text-sm font-semibold">Strava</p>
          {!stravaStatus.connected ? (
            <button type="button" onClick={() => void connectStrava()} className="mt-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold hover:bg-black/5">
              Połącz ze Strava
            </button>
          ) : (
            <p className="mt-2 text-sm text-emerald-700">Połączono jako {stravaStatus.athlete?.firstname ?? stravaStatus.athlete?.username ?? "użytkownik"}.</p>
          )}

          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
            <input
              value={form.stravaUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, stravaUrl: event.target.value }))}
              placeholder="https://www.strava.com/activities/123456789"
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            />
            <button type="button" onClick={() => void importFromStrava()} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold hover:bg-black/5">
              Importuj ze Strava
            </button>
          </div>
          {stravaMessage && <p className="mt-2 text-sm text-[var(--muted)]">{stravaMessage}</p>}
        </div>

        <form onSubmit={(event) => void onSubmit(event)} className="mt-6 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Twoje imię / nick</span>
            <input value={form.submitterName} onChange={(e) => setForm((prev) => ({ ...prev, submitterName: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Email (opcjonalnie)</span>
            <input value={form.submitterEmail} onChange={(e) => setForm((prev) => ({ ...prev, submitterEmail: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">Nazwa trasy</span>
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Region</span>
            <select
              value={form.region}
              onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))}
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            >
              <option value="">Wybierz województwo…</option>
              {VOIVODESHIPS.map((voivodeship) => (
                <option key={voivodeship} value={voivodeship}>
                  {voivodeship}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Ocena (1-5)</span>
            <input value={form.rating} onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Dystans (km)</span>
            <input value={form.distanceKm} onChange={(e) => setForm((prev) => ({ ...prev, distanceKm: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Przewyższenie (m)</span>
            <input value={form.elevationM} onChange={(e) => setForm((prev) => ({ ...prev, elevationM: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Min. wiek</span>
            <input value={form.minAge} onChange={(e) => setForm((prev) => ({ ...prev, minAge: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Asfalt (%)</span>
            <input value={form.asphaltPct} onChange={(e) => setForm((prev) => ({ ...prev, asphaltPct: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">Opis</span>
            <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="min-h-24 rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">Odcinek krytyczny</span>
            <input value={form.hardestPart} onChange={(e) => setForm((prev) => ({ ...prev, hardestPart: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Parking</span>
            <input value={form.parking} onChange={(e) => setForm((prev) => ({ ...prev, parking: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Jedzenie</span>
            <input value={form.food} onChange={(e) => setForm((prev) => ({ ...prev, food: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">Nocleg</span>
            <input value={form.sleep} onChange={(e) => setForm((prev) => ({ ...prev, sleep: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">Atrakcje (po przecinku)</span>
            <input value={form.attractionsCsv} onChange={(e) => setForm((prev) => ({ ...prev, attractionsCsv: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">Notatka rodzica</span>
            <textarea value={form.familyNote} onChange={(e) => setForm((prev) => ({ ...prev, familyNote: e.target.value }))} className="min-h-20 rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">Link GPX</span>
            <input value={form.gpxUrl} onChange={(e) => setForm((prev) => ({ ...prev, gpxUrl: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">Upload GPX</span>
            <input
              type="file"
              accept=".gpx,application/gpx+xml,application/xml,text/xml"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void uploadFile("gpx", file);
                event.currentTarget.value = "";
              }}
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">URL mapy embed</span>
            <input value={form.mapEmbedUrl} onChange={(e) => setForm((prev) => ({ ...prev, mapEmbedUrl: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">URL video (opcjonalnie)</span>
            <input value={form.videoUrl} onChange={(e) => setForm((prev) => ({ ...prev, videoUrl: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">Upload video</span>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void uploadFile("video", file);
                event.currentTarget.value = "";
              }}
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">URL-e zdjęć (po przecinku)</span>
            <input value={form.photoUrlsCsv} onChange={(e) => setForm((prev) => ({ ...prev, photoUrlsCsv: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">Upload zdjęć</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void uploadFile("photo", file);
                event.currentTarget.value = "";
              }}
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">Najlepsze miesiące (po przecinku)</span>
            <input value={form.bestMonthsCsv} onChange={(e) => setForm((prev) => ({ ...prev, bestMonthsCsv: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">Co spakować (po przecinku)</span>
            <input value={form.packingListCsv} onChange={(e) => setForm((prev) => ({ ...prev, packingListCsv: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
          </label>

          <div className="mt-2 flex gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={!canSubmit || submitState === "saving"}
              className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Wyslij do weryfikacji
            </button>
          </div>
        </form>

        {mediaMessage && <p className="mt-3 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">{mediaMessage}</p>}

        {submitMessage && (
          <p
            className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
              submitState === "ok"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : submitState === "error"
                  ? "border-rose-300 bg-rose-50 text-rose-800"
                  : "border-[var(--line)] bg-white text-[var(--muted)]"
            }`}
          >
            {submitMessage}
          </p>
        )}
      </main>
    </div>
  );
}
