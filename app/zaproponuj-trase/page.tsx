"use client";

import Link from "next/link";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { PointPickerMap } from "@/components/maps/PointPickerMap";
import { POINT_KIND_LABELS } from "@/components/maps/PointPickerMapClient";
import { VOIVODESHIPS } from "@/lib/voivodeships";
import type { PitchPoint, PitchPointKind } from "@/lib/types";

const MAX_PHOTOS = 8;
const MAX_POINTS = 30;
const MAX_IMAGE_SIDE = 2000;

const fieldClass = "rounded-xl border border-[var(--line)] bg-white px-3 py-2";

// Zmniejszamy zdjęcie w przeglądarce: limit body funkcji na Vercelu to ok. 4,5 MB,
// a zdjęcia z telefonu mają zwykle 5-12 MB.
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas"))), "image/jpeg", 0.85);
  });
}

export default function ProposeRoutePage() {
  const [openedAt] = useState<number>(() => Date.now());
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [points, setPoints] = useState<PitchPoint[]>([]);
  const [nextKind, setNextKind] = useState<PitchPointKind>("start");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoMessage, setPhotoMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  const addPoint = (lat: number, lng: number) => {
    if (points.length >= MAX_POINTS) {
      return;
    }
    const kind: PitchPointKind = points.length === 0 ? "start" : nextKind;
    setPoints((prev) => [...prev, { lat, lng, kind, label: "" }]);
    if (points.length === 0) {
      setNextKind("stop");
    }
  };

  const onPhotosSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, MAX_PHOTOS - photos.length);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    setUploading(true);
    setPhotoMessage("");
    const uploaded: string[] = [];

    for (const file of files) {
      try {
        const blob = await shrinkImage(file);
        const body = new FormData();
        body.append("file", blob, "zdjecie.jpg");
        const response = await fetch("/api/community/pitches/photo", { method: "POST", body });
        const payload = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !payload.url) {
          setPhotoMessage(payload.error ?? "Nie udało się wgrać zdjęcia.");
          continue;
        }
        uploaded.push(payload.url);
      } catch {
        setPhotoMessage("Nie udało się przetworzyć zdjęcia. Użyj formatu JPG, PNG lub WebP.");
      }
    }

    setPhotos((prev) => [...prev, ...uploaded]);
    setUploading(false);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("sending");
    setMessage("");

    try {
      const response = await fetch("/api/community/pitches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName,
          submitterEmail,
          name,
          region,
          description,
          points,
          photos: photos.map((src) => ({ src })),
          rightsConfirmed,
          website,
          openedAt,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setState("error");
        setMessage(payload.error ?? "Nie udało się wysłać propozycji.");
        return;
      }

      setState("ok");
      setMessage("Dzięki! Propozycja wysłana. Przygotujemy z niej trasę i damy znać, gdy będzie opublikowana.");
      setName("");
      setRegion("");
      setDescription("");
      setPoints([]);
      setPhotos([]);
      setRightsConfirmed(false);
      setNextKind("start");
    } catch {
      setState("error");
      setMessage("Nie udało się wysłać propozycji.");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sand)] px-5 py-10 text-[var(--ink)] md:px-10">
      <main className="mx-auto w-full max-w-4xl rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_10px_34px_rgba(16,32,22,.1)] md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold md:text-4xl">Zaproponuj trasę</h1>
          <Link href="/" className="rounded-xl border border-[var(--ink)] px-3 py-2 text-sm font-semibold hover:bg-black/5">
            Wróć na główną
          </Link>
        </div>

        <p className="mt-3 text-sm text-[var(--muted)]">
          Znasz fajną trasę dla rodzin? Zaznacz na mapie kluczowe punkty, dodaj zdjęcia i kilka zdań opisu. My przygotujemy z tego pełną
          trasę. Masz gotowy ślad GPX?{" "}
          <Link href="/submit-route" className="font-semibold text-[var(--accent-text)] underline">
            Dodaj pełne zgłoszenie
          </Link>
          .
        </p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">Nazwa trasy</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} placeholder="np. Podczele - Dźwirzyno" className={fieldClass} />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Województwo</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)} required className={fieldClass}>
              <option value="">Wybierz województwo…</option>
              {VOIVODESHIPS.map((voivodeship) => (
                <option key={voivodeship} value={voivodeship}>
                  {voivodeship}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Co dodajesz kliknięciem na mapie?</span>
            <select value={nextKind} onChange={(e) => setNextKind(e.target.value as PitchPointKind)} className={fieldClass}>
              {(Object.keys(POINT_KIND_LABELS) as PitchPointKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {POINT_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2">
            <p className="mb-1 text-sm font-semibold">Mapa: kliknij, żeby dodać punkt (min. 2: start i cel)</p>
            <div className="h-80 overflow-hidden rounded-xl border border-[var(--line)]">
              <PointPickerMap points={points} onAdd={addPoint} />
            </div>

            {points.length > 0 ? (
              <ul className="mt-3 grid gap-2">
                {points.map((point, index) => (
                  <li key={`${point.lat}-${point.lng}-${index}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-white p-2 text-sm">
                    <span className="w-6 text-center font-bold">{index + 1}</span>
                    <select
                      value={point.kind}
                      onChange={(e) => setPoints((prev) => prev.map((p, i) => (i === index ? { ...p, kind: e.target.value as PitchPointKind } : p)))}
                      className="rounded-lg border border-[var(--line)] px-2 py-1"
                    >
                      {(Object.keys(POINT_KIND_LABELS) as PitchPointKind[]).map((kind) => (
                        <option key={kind} value={kind}>
                          {POINT_KIND_LABELS[kind]}
                        </option>
                      ))}
                    </select>
                    <input
                      value={point.label}
                      onChange={(e) => setPoints((prev) => prev.map((p, i) => (i === index ? { ...p, label: e.target.value } : p)))}
                      maxLength={80}
                      placeholder="Nazwa lub opis punktu (opcjonalnie)"
                      className="min-w-0 flex-1 rounded-lg border border-[var(--line)] px-2 py-1"
                    />
                    <button
                      type="button"
                      onClick={() => setPoints((prev) => prev.filter((_, i) => i !== index))}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-900"
                    >
                      Usuń
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-semibold">Opis: dlaczego warto, dla jakiego wieku, jaka nawierzchnia</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={20} maxLength={3000} rows={6} className={fieldClass} />
          </label>

          <div className="md:col-span-2">
            <p className="text-sm font-semibold">Zdjęcia (do {MAX_PHOTOS}, JPG/PNG/WebP)</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={uploading || photos.length >= MAX_PHOTOS}
              onChange={(e) => void onPhotosSelected(e)}
              className="mt-1 block text-sm"
            />
            {uploading ? <p className="mt-1 text-sm text-[var(--muted)]">Wgrywam zdjęcia...</p> : null}
            {photoMessage ? <p className="mt-1 text-sm text-rose-800">{photoMessage}</p> : null}
            {photos.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {photos.map((src) => (
                  <li key={src} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="Dodane zdjęcie" className="h-20 w-20 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((item) => item !== src))}
                      aria-label="Usuń zdjęcie"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-600 text-xs font-bold text-white"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Twoje imię / nick</span>
            <input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} required maxLength={80} className={fieldClass} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">E-mail (opcjonalnie, damy znać o publikacji)</span>
            <input type="email" value={submitterEmail} onChange={(e) => setSubmitterEmail(e.target.value)} maxLength={120} className={fieldClass} />
          </label>

          {/* Honeypot: ukryte przed ludźmi, boty zwykle wypełniają wszystkie pola. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Strona WWW
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          <label className="flex items-start gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={rightsConfirmed} onChange={(e) => setRightsConfirmed(e.target.checked)} required className="mt-1" />
            <span>
              Potwierdzam, że zdjęcia i opis są moje (lub mam zgodę autora), i zgadzam się na ich publikację na stronie Family Ride oraz na
              redakcję tekstu. Adres e-mail nie będzie nigdzie pokazywany.
            </span>
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={state === "sending" || uploading || points.length < 2 || !rightsConfirmed}
              className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state === "sending" ? "Wysyłam..." : "Wyślij propozycję"}
            </button>
            {points.length < 2 ? <p className="mt-2 text-xs text-[var(--muted)]">Zaznacz na mapie co najmniej 2 punkty.</p> : null}
            {state === "ok" ? <p className="mt-3 rounded-xl border border-[var(--line)] bg-[#e7f5e8] px-3 py-2 text-sm">{message}</p> : null}
            {state === "error" ? <p className="mt-3 rounded-xl border border-[var(--line)] bg-[#ffe9e2] px-3 py-2 text-sm">{message}</p> : null}
          </div>
        </form>
      </main>
    </div>
  );
}
