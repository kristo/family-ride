"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { StravaImportPanel } from "@/components/admin/StravaImportPanel";
import { csvToList, preparePhotoForUpload } from "@/lib/client/admin-uploads";
import type { Route, RouteSurfaceEstimate } from "@/lib/types";

export type FormState = {
  name: string;
  region: string;
  distanceKm: string;
  elevationM: string;
  minAge: string;
  asphaltPct: string;
  rating: string;
  description: string;
  hardestPart: string;
  parking: string;
  food: string;
  sleep: string;
  attractionsCsv: string;
  familyNote: string;
  gpxUrl: string;
  mapEmbedUrl: string;
  stravaUrl: string;
  videoUrl: string;
  photoUrlsCsv: string;
  verificationLevel: "draft" | "community" | "verified";
};

export type VerificationChecklist = {
  routeLineReviewed: boolean;
  metricsReviewed: boolean;
  logisticsReviewed: boolean;
  familySafetyReviewed: boolean;
};

type GpxListItem = {
  name: string;
  url: string;
  sizeBytes: number;
  updatedAt: string;
};

type RouteCrudMode = "create" | "edit" | "delete";

const DEFAULT_BEST_MONTHS = ["maj", "czerwiec", "wrzesień"];
const DEFAULT_PACKING_LIST = ["kask", "bidony", "zapasowa detka"];

const initialVerificationChecklist: VerificationChecklist = {
  routeLineReviewed: false,
  metricsReviewed: false,
  logisticsReviewed: false,
  familySafetyReviewed: false,
};

const initialState: FormState = {
  name: "",
  region: "",
  distanceKm: "",
  elevationM: "",
  minAge: "",
  asphaltPct: "",
  rating: "",
  description: "",
  hardestPart: "",
  parking: "",
  food: "",
  sleep: "",
  attractionsCsv: "",
  familyNote: "",
  gpxUrl: "/gpx/",
  mapEmbedUrl: "https://www.openstreetmap.org/export/embed.html?bbox=19.0%2C49.0%2C20.0%2C50.0&layer=mapnik",
  stravaUrl: "",
  videoUrl: "",
  photoUrlsCsv: "",
  verificationLevel: "draft",
};

type RoutesTabProps = {
  hidden: boolean;
  publishedRoutes: Route[];
  refreshPublishedRoutes: () => void;
};

export function RoutesTab({ hidden, publishedRoutes, refreshPublishedRoutes }: RoutesTabProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [routeCrudMode, setRouteCrudMode] = useState<RouteCrudMode>("create");
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [gpxFiles, setGpxFiles] = useState<GpxListItem[]>([]);
  const [gpxUploadStatus, setGpxUploadStatus] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [gpxUploadMessage, setGpxUploadMessage] = useState<string>("");
  const [photoUploadStatus, setPhotoUploadStatus] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [photoUploadMessage, setPhotoUploadMessage] = useState<string>("");
  const [videoUploadStatus, setVideoUploadStatus] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [videoUploadMessage, setVideoUploadMessage] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [importedFromStrava, setImportedFromStrava] = useState<boolean>(false);
  const [verificationChecklist, setVerificationChecklist] = useState<VerificationChecklist>(initialVerificationChecklist);
  const [importedSurfaceEstimate, setImportedSurfaceEstimate] = useState<RouteSurfaceEstimate | null>(null);
  const isVerificationChecklistComplete = useMemo(() => {
    return Object.values(verificationChecklist).every((item) => item);
  }, [verificationChecklist]);

  const canSave = useMemo(() => {
    return form.name.trim().length > 2 && form.region.trim().length > 1 && form.description.trim().length > 10;
  }, [form]);

  const missingRequiredFields = useMemo(() => {
    const missing: string[] = [];

    if (form.name.trim().length <= 2) {
      missing.push("Nazwa trasy (minimum 3 znaki)");
    }
    if (form.region.trim().length <= 1) {
      missing.push("Region (minimum 2 znaki)");
    }
    if (form.description.trim().length <= 10) {
      missing.push("Opis trasy (minimum 11 znaków)");
    }

    return missing;
  }, [form.description, form.name, form.region]);

  const missingVerificationChecklist = useMemo(() => {
    if (form.verificationLevel !== "verified") {
      return [] as string[];
    }

    const missing: string[] = [];
    if (!verificationChecklist.routeLineReviewed) {
      missing.push("Sprawdzony przebieg trasy na mapie");
    }
    if (!verificationChecklist.metricsReviewed) {
      missing.push("Potwierdzony dystans i przewyższenie");
    }
    if (!verificationChecklist.logisticsReviewed) {
      missing.push("Zweryfikowana logistyka (parking, jedzenie, nocleg)");
    }
    if (!verificationChecklist.familySafetyReviewed) {
      missing.push("Potwierdzone bezpieczeństwo rodzinne");
    }

    return missing;
  }, [form.verificationLevel, verificationChecklist]);

  const isSaveDisabled = !canSave || missingVerificationChecklist.length > 0;
  const isRouteSubmitDisabled = routeCrudMode === "edit" ? !editingRouteId || isSaveDisabled : isSaveDisabled;

  const loadGpxFiles = async () => {
    try {
      const response = await fetch("/api/admin/gpx", { method: "GET" });
      if (!response.ok) {
        throw new Error("Nie udało się pobrać listy GPX.");
      }
      const payload = (await response.json()) as { files?: GpxListItem[] };
      setGpxFiles(Array.isArray(payload.files) ? payload.files : []);
    } catch {
      setGpxFiles([]);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadGpxFiles();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  const fillFormFromRoute = (route: Route) => {
    setRouteCrudMode("edit");
    setEditingRouteId(route.id);
    setImportedFromStrava(Boolean(route.stravaUrl));
    setImportedSurfaceEstimate(route.surfaceEstimate ?? null);
    setStatus("idle");
    setStatusMessage("");

    setForm({
      name: route.name,
      region: route.region,
      distanceKm: String(route.distanceKm),
      elevationM: String(route.elevationM),
      minAge: String(route.minAge),
      asphaltPct: String(route.asphaltPct),
      rating: String(route.rating),
      description: route.description,
      hardestPart: route.hardestPart,
      parking: route.parking,
      food: route.food,
      sleep: route.sleep,
      attractionsCsv: route.attractions.join(", "),
      familyNote: route.familyNote,
      gpxUrl: route.gpxUrl,
      mapEmbedUrl: route.mapEmbedUrl,
      stravaUrl: route.stravaUrl ?? "",
      videoUrl: route.videoUrl ?? "",
      photoUrlsCsv: route.gallery.map((item) => item.src).join(", "),
      verificationLevel: route.verification.level,
    });

    setVerificationChecklist({
      routeLineReviewed: route.verification.level === "verified",
      metricsReviewed: route.verification.level === "verified",
      logisticsReviewed: route.verification.level === "verified",
      familySafetyReviewed: route.verification.level === "verified",
    });
  };

  const resetRouteForm = () => {
    // Zawsze wracamy do trybu "Dodaj nową". Bez tego, po zapisaniu/anulowaniu edycji,
    // tryb zostawał na "edit" z wyczyszczonym editingRouteId - przycisk zapisu był wtedy
    // wyłączony (patrz isRouteSubmitDisabled) i wpisywanie danych nowej trasy nic nie dawało,
    // dopóki ktoś ręcznie nie kliknął "Dodaj nową" jeszcze raz.
    setRouteCrudMode("create");
    setEditingRouteId(null);
    setForm(initialState);
    setVerificationChecklist(initialVerificationChecklist);
    setImportedFromStrava(false);
    setImportedSurfaceEstimate(null);
    setStatusMessage("");
    setStatus("idle");
  };

  const uploadGpx = async (file: File) => {
    setGpxUploadStatus("uploading");
    setGpxUploadMessage("Wgrywanie pliku GPX...");

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/admin/gpx", {
        method: "POST",
        body,
      });

      const payload = (await response.json()) as {
        error?: string;
        file?: { url?: string; name?: string };
      };

      if (!response.ok || !payload.file?.url) {
        setGpxUploadStatus("error");
        setGpxUploadMessage(payload.error ?? "Upload GPX nie powiódł się.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        gpxUrl: payload.file?.url ?? prev.gpxUrl,
      }));
      setImportedFromStrava(false);
      setImportedSurfaceEstimate(null);
      setGpxUploadStatus("ok");
      setGpxUploadMessage(`Gotowe: ${payload.file.name ?? "plik.gpx"}`);
      await loadGpxFiles();
    } catch {
      setGpxUploadStatus("error");
      setGpxUploadMessage("Upload GPX nie powiódł się.");
    }
  };

  const uploadMedia = async (file: File, kind: "photo" | "video") => {
    if (kind === "photo") {
      setPhotoUploadStatus("uploading");
      setPhotoUploadMessage("Wgrywanie zdjęcia...");
    } else {
      setVideoUploadStatus("uploading");
      setVideoUploadMessage("Wgrywanie video...");
    }

    try {
      const preparedFile = kind === "photo" ? await preparePhotoForUpload(file) : file;

      const body = new FormData();
      body.append("file", preparedFile);

      const response = await fetch(`/api/admin/media?kind=${kind}`, {
        method: "POST",
        body,
      });

      const responseText = await response.text();
      let payload: {
        error?: string;
        file?: { url?: string; name?: string };
      } = {};

      if (responseText.trim().length > 0) {
        try {
          payload = JSON.parse(responseText) as {
            error?: string;
            file?: { url?: string; name?: string };
          };
        } catch {
          payload = {};
        }
      }

      if (!response.ok || !payload.file?.url) {
        const message =
          payload.error ??
          (response.status === 413
            ? "Plik jest za duży do wysyłki. Dla zdjęć celuj w maksymalnie około 4 MB po kompresji."
            : `Upload pliku nie powiódł się (HTTP ${response.status}).`);
        if (kind === "photo") {
          setPhotoUploadStatus("error");
          setPhotoUploadMessage(message);
        } else {
          setVideoUploadStatus("error");
          setVideoUploadMessage(message);
        }
        return;
      }

      if (kind === "photo") {
        setForm((prev) => {
          const nextCsv = prev.photoUrlsCsv.trim().length > 0 ? `${prev.photoUrlsCsv}, ${payload.file?.url}` : (payload.file?.url ?? "");
          return {
            ...prev,
            photoUrlsCsv: nextCsv,
          };
        });
        setPhotoUploadStatus("ok");
        setPhotoUploadMessage(`Dodano: ${payload.file.name ?? "zdjęcie"}`);
      } else {
        setForm((prev) => ({
          ...prev,
          videoUrl: payload.file?.url ?? prev.videoUrl,
        }));
        setVideoUploadStatus("ok");
        setVideoUploadMessage(`Dodano: ${payload.file.name ?? "video"}`);
      }
    } catch (error) {
      const fallbackMessage =
        error instanceof Error
          ? error.message
          : kind === "photo"
            ? "Upload zdjęcia nie powiódł się. Sprawdź rozmiar i format pliku."
            : "Upload wideo nie powiódł się.";

      if (kind === "photo") {
        setPhotoUploadStatus("error");
        setPhotoUploadMessage(fallbackMessage);
      } else {
        setVideoUploadStatus("error");
        setVideoUploadMessage(fallbackMessage);
      }
    }
  };

  const uploadRoutePhotos = async (files: FileList) => {
    const fileItems = Array.from(files);
    if (fileItems.length === 0) {
      return;
    }

    setPhotoUploadStatus("uploading");
    setPhotoUploadMessage(`Wgrywanie ${fileItems.length} zdjęć...`);

    const uploadedUrls: string[] = [];

    for (const file of fileItems) {
      try {
        const preparedFile = await preparePhotoForUpload(file);
        const body = new FormData();
        body.append("file", preparedFile);

        const response = await fetch("/api/admin/media?kind=photo", {
          method: "POST",
          body,
        });

        const payload = (await response.json()) as {
          error?: string;
          file?: { url?: string; name?: string };
        };

        if (!response.ok || !payload.file?.url) {
          throw new Error(payload.error ?? "Upload zdjęcia nie powiódł się.");
        }

        uploadedUrls.push(payload.file.url);
      } catch (error) {
        setPhotoUploadStatus("error");
        setPhotoUploadMessage(error instanceof Error ? error.message : "Nie udało się przesłać zdjęć do trasy.");
        return;
      }
    }

    setForm((prev) => {
      const current = csvToList(prev.photoUrlsCsv);
      const merged = [...current, ...uploadedUrls];
      return {
        ...prev,
        photoUrlsCsv: merged.join(", "),
      };
    });

    setPhotoUploadStatus("ok");
    setPhotoUploadMessage(`Dodano ${uploadedUrls.length} zdjęć do galerii trasy.`);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (routeCrudMode === "delete") {
      setStatusMessage("Tryb usuwania nie używa formularza. Wybierz trasę z listy do usunięcia.");
      setStatus("error");
      return;
    }

    if (routeCrudMode === "edit" && !editingRouteId) {
      setStatusMessage("Wybierz trasę do edycji, a następnie zapisz zmiany.");
      setStatus("error");
      return;
    }

    const distanceKm = Number(form.distanceKm);
    const elevationM = Number(form.elevationM);
    const minAge = Number(form.minAge);
    const asphaltPct = Math.max(0, Math.min(100, Number(form.asphaltPct)));
    const rating = Math.max(1, Math.min(5, Number(form.rating)));

    setStatusMessage("");

    if (!Number.isFinite(distanceKm) || !Number.isFinite(elevationM) || !Number.isFinite(minAge) || !Number.isFinite(rating)) {
      setStatusMessage("Sprawdź pola liczbowe: dystans, przewyższenie, wiek, asfalt i ocena.");
      setStatus("error");
      return;
    }

    if (form.verificationLevel === "verified" && !isVerificationChecklistComplete) {
      setStatusMessage("Aby zapisać trasę jako zweryfikowaną, uzupełnij checklistę weryfikacji.");
      setStatus("error");
      return;
    }

    const photoUrls = csvToList(form.photoUrlsCsv);

    const draft = {
      name: form.name.trim(),
      region: form.region.trim(),
      distanceKm,
      elevationM,
      minAge,
      asphaltPct,
      gravelPct: Math.max(0, 100 - asphaltPct),
      rating,
      description: form.description.trim(),
      hardestPart: form.hardestPart.trim(),
      parking: form.parking.trim(),
      food: form.food.trim(),
      sleep: form.sleep.trim(),
      attractions: csvToList(form.attractionsCsv),
      familyNote: form.familyNote.trim(),
      gpxUrl: form.gpxUrl.trim(),
      mapEmbedUrl: form.mapEmbedUrl.trim(),
      videoUrl: form.videoUrl.trim() || undefined,
      stravaUrl: form.stravaUrl.trim() || undefined,
      bestMonths: DEFAULT_BEST_MONTHS,
      packingList: DEFAULT_PACKING_LIST,
      verification: {
        level: form.verificationLevel,
        gpxQuality: form.verificationLevel === "verified" ? "full-track" : form.gpxUrl.trim().endsWith(".gpx") ? "outline" : "none",
        updatedAt: new Date().toISOString().slice(0, 10),
        note:
          form.verificationLevel === "verified"
            ? importedFromStrava
              ? "Dane oznaczone jako zweryfikowane po imporcie ze Strava i przejsciu checklisty admina."
              : "Dane oznaczone jako zweryfikowane przez administratora."
            : form.verificationLevel === "community"
              ? "Dane społecznościowe, wymagają potwierdzenia przed wyjazdem."
              : "Wersja robocza do dalszego dopracowania.",
      },
      surfaceEstimate: importedSurfaceEstimate ?? undefined,
      gallery:
        photoUrls.length > 0
          ? photoUrls.map((url, index) => ({
              src: url,
              alt: `${form.name.trim() || "Trasa"} - zdjęcie ${index + 1}`,
              caption: `Kadr ${index + 1} z trasy`,
            }))
          : [
              {
                src: "/photos/family-bike-1.jpg",
                alt: "Podglad trasy rodzinnej",
                caption: "Dodaj docelowe zdjęcia trasy w kolejnym kroku.",
              },
            ],
    };

    try {
      const endpoint = routeCrudMode === "edit" ? `/api/admin/routes/${editingRouteId}` : "/api/admin/routes";
      const method = routeCrudMode === "edit" ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewedBy: "admin",
          verificationLevel: form.verificationLevel,
          draft,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatusMessage(payload.error ?? "Nie udało się zapisać trasy w bazie.");
        setStatus("error");
        return;
      }

      resetRouteForm();
      setStatusMessage(routeCrudMode === "edit" ? "Zmiany trasy zostały zapisane." : "Trasa zapisana w bazie i opublikowana.");
      setStatus("saved");
      refreshPublishedRoutes();
    } catch {
      setStatusMessage("Nie udało się zapisać trasy w bazie.");
      setStatus("error");
    }
  };

  const removeRoute = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/routes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setStatusMessage("Nie udało się usunąć trasy.");
        setStatus("error");
        return;
      }

      refreshPublishedRoutes();
      if (editingRouteId === id) {
        resetRouteForm();
      }
      setStatusMessage("Trasa usunięta.");
      setStatus("saved");
    } catch {
      setStatusMessage("Nie udało się usunąć trasy.");
      setStatus("error");
    }
  };

  const exportRoutes = () => {
    const payload = JSON.stringify(publishedRoutes, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "published-routes.json";
    link.click();
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <>
      <section
        id="route-editor"
        className={`rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_10px_34px_rgba(16,32,22,.1)] md:p-8 ${hidden ? "hidden" : ""}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-3xl font-bold md:text-4xl">Zarządzanie trasami</h2>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Dodaj trasę bez edycji plików. Trasy zapisujemy w bazie (Vercel Blob) i publikujemy od razu na stronie głównej.
        </p>

        <nav className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.08em]" aria-label="Nawigacja panelu admina">
          <Link href="/admin/routes" className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 hover:bg-black/5">Trasy</Link>
          <Link href="/admin/moderation" className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 hover:bg-black/5">Moderacja</Link>
          <Link href="/admin/stories" className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 hover:bg-black/5">Photo Stories</Link>
          <Link href="/admin/reviews" className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 hover:bg-black/5">Oceny gości</Link>
        </nav>

        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Tryb zarządzania trasami">
          <button
            type="button"
            onClick={() => {
              setRouteCrudMode("create");
              resetRouteForm();
            }}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
              routeCrudMode === "create" ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white"
            }`}
          >
            Dodaj nową
          </button>
          <button
            type="button"
            onClick={() => {
              setRouteCrudMode("edit");
              setStatus("idle");
              setStatusMessage("");
            }}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
              routeCrudMode === "edit" ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white"
            }`}
          >
            Edytuj
          </button>
          <button
            type="button"
            onClick={() => {
              setRouteCrudMode("delete");
              setStatus("idle");
              setStatusMessage("");
              setEditingRouteId(null);
            }}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
              routeCrudMode === "delete" ? "border-rose-700 bg-rose-700 text-white" : "border-[var(--line)] bg-white"
            }`}
          >
            Usuń
          </button>
        </div>

        {routeCrudMode === "create" && <p className="mt-4 text-sm text-[var(--muted)]">Tryb dodawania nowej trasy z możliwością importu ze Strava.</p>}
        {routeCrudMode === "edit" && <p className="mt-4 text-sm text-[var(--muted)]">Tryb edycji istniejących tras. Najpierw wybierz trasę z listy, potem zapisz zmiany.</p>}
        {routeCrudMode === "delete" && <p className="mt-4 text-sm text-[var(--muted)]">Tryb usuwania. Tutaj tylko usuwasz trasy z bazy.</p>}

        {routeCrudMode === "create" && (
          <StravaImportPanel
            stravaUrl={form.stravaUrl}
            setForm={setForm}
            setImportedFromStrava={setImportedFromStrava}
            setVerificationChecklist={setVerificationChecklist}
            setImportedSurfaceEstimate={setImportedSurfaceEstimate}
            onGpxImported={() => void loadGpxFiles()}
          />
        )}

        {routeCrudMode === "edit" && (
          <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/85 p-4">
            <h2 className="text-lg font-bold">Wybierz trasę do edycji</h2>
            {publishedRoutes.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">Brak tras do edycji. Najpierw dodaj trasę w trybie Dodaj nową.</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {publishedRoutes.map((route) => (
                  <li key={`edit-${route.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold">{route.name}</p>
                      <p className="text-xs text-[var(--muted)]">{route.region} | {route.distanceKm} km</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fillFormFromRoute(route)}
                      className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs font-semibold"
                    >
                      Wczytaj do edycji
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {routeCrudMode === "delete" && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
            <h2 className="text-lg font-bold text-rose-900">Usuń trasę z bazy</h2>
            {publishedRoutes.length === 0 ? (
              <p className="mt-2 text-sm text-rose-900/80">Brak tras do usunięcia.</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {publishedRoutes.map((route) => (
                  <li key={`delete-${route.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold">{route.name}</p>
                      <p className="text-xs text-[var(--muted)]">{route.region} | {route.distanceKm} km</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRoute(route.id)}
                      className="rounded-lg border border-rose-300 bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-900"
                    >
                      Usuń trasę
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {routeCrudMode !== "delete" && editingRouteId && (
          <div className="mt-6 rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900">
            Edytujesz wybraną trasę. Po zapisaniu zmiany zostaną od razu opublikowane na stronie.
          </div>
        )}

        {routeCrudMode !== "delete" && (
          <form onSubmit={onSubmit} className="mt-6 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">Nazwa trasy</span>
              <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Region</span>
              <input value={form.region} onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
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
              <span className="font-semibold">Minimalny wiek</span>
              <input value={form.minAge} onChange={(e) => setForm((prev) => ({ ...prev, minAge: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Asfalt (%)</span>
              <input value={form.asphaltPct} onChange={(e) => setForm((prev) => ({ ...prev, asphaltPct: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Status weryfikacji</span>
              <select
                value={form.verificationLevel}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    verificationLevel: e.target.value as "draft" | "community" | "verified",
                  }))
                }
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              >
                <option value="draft">Robocza</option>
                <option value="community">Do potwierdzenia</option>
                <option value="verified">Zweryfikowana</option>
              </select>
            </label>

            {form.verificationLevel === "verified" && (
              <div className="grid gap-2 rounded-xl border border-[var(--line)] bg-white/80 p-3 text-sm md:col-span-2">
                <p className="font-semibold">Checklista weryfikacji trasy</p>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={verificationChecklist.routeLineReviewed}
                    onChange={(e) =>
                      setVerificationChecklist((prev) => ({
                        ...prev,
                        routeLineReviewed: e.target.checked,
                      }))
                    }
                  />
                  Przebieg trasy na mapie został sprawdzony.
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={verificationChecklist.metricsReviewed}
                    onChange={(e) =>
                      setVerificationChecklist((prev) => ({
                        ...prev,
                        metricsReviewed: e.target.checked,
                      }))
                    }
                  />
                  Dystans i przewyższenie są potwierdzone.
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={verificationChecklist.logisticsReviewed}
                    onChange={(e) =>
                      setVerificationChecklist((prev) => ({
                        ...prev,
                        logisticsReviewed: e.target.checked,
                      }))
                    }
                  />
                  Logistyka (parking, jedzenie, nocleg) jest aktualna.
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={verificationChecklist.familySafetyReviewed}
                    onChange={(e) =>
                      setVerificationChecklist((prev) => ({
                        ...prev,
                        familySafetyReviewed: e.target.checked,
                      }))
                    }
                  />
                  Trasa jest bezpieczna dla rodziny w zadanych parametrach.
                </label>
                {!isVerificationChecklistComplete && (
                  <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Aby zapisać status Zweryfikowana, zaznacz wszystkie punkty checklisty.
                  </p>
                )}
              </div>
            )}

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">Opis trasy</span>
              <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="min-h-20 rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">Odcinek krytyczny</span>
              <input value={form.hardestPart} onChange={(e) => setForm((prev) => ({ ...prev, hardestPart: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">Parking</span>
              <input value={form.parking} onChange={(e) => setForm((prev) => ({ ...prev, parking: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Jedzenie</span>
              <input value={form.food} onChange={(e) => setForm((prev) => ({ ...prev, food: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm">
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
                  if (!file) {
                    return;
                  }
                  void uploadGpx(file);
                  event.currentTarget.value = "";
                }}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              />
              <p className="text-xs text-[var(--muted)]">Plik zostanie zapisany w public/gpx/uploads i automatycznie podstawi się do pola Link GPX.</p>
              {gpxUploadStatus !== "idle" && (
                <p
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    gpxUploadStatus === "ok"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : gpxUploadStatus === "error"
                        ? "border-rose-300 bg-rose-50 text-rose-800"
                        : "border-[var(--line)] bg-white text-[var(--muted)]"
                  }`}
                >
                  {gpxUploadMessage}
                </p>
              )}
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">Wybierz istniejacy GPX</span>
              <select
                value={form.gpxUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, gpxUrl: e.target.value }))}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              >
                <option value="">Wybierz plik z serwera</option>
                {gpxFiles.map((file) => (
                  <option key={`${file.url}-${file.updatedAt}`} value={file.url}>
                    {file.name} ({Math.max(1, Math.round(file.sizeBytes / 1024))} KB)
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">Link mapy embed</span>
              <input value={form.mapEmbedUrl} onChange={(e) => setForm((prev) => ({ ...prev, mapEmbedUrl: e.target.value }))} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2" />
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">URL video (opcjonalnie)</span>
              <input
                value={form.videoUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
                placeholder="https://.../przejazd.mp4"
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">Upload video (bezpiecznie do Blob)</span>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  void uploadMedia(file, "video");
                  event.currentTarget.value = "";
                }}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              />
              {videoUploadStatus !== "idle" && (
                <p
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    videoUploadStatus === "ok"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : videoUploadStatus === "error"
                        ? "border-rose-300 bg-rose-50 text-rose-800"
                        : "border-[var(--line)] bg-white text-[var(--muted)]"
                  }`}
                >
                  {videoUploadMessage}
                </p>
              )}
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">URL-e zdjęć (po przecinku)</span>
              <input
                value={form.photoUrlsCsv}
                onChange={(e) => setForm((prev) => ({ ...prev, photoUrlsCsv: e.target.value }))}
                placeholder="https://.../foto1.jpg, https://.../foto2.jpg"
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">Upload zdjęć (bezpiecznie do Blob)</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif"
                onChange={(event) => {
                  if (!event.target.files || event.target.files.length === 0) {
                    return;
                  }
                  void uploadRoutePhotos(event.target.files);
                  event.currentTarget.value = "";
                }}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              />
              {photoUploadStatus !== "idle" && (
                <p
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    photoUploadStatus === "ok"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : photoUploadStatus === "error"
                        ? "border-rose-300 bg-rose-50 text-rose-800"
                        : "border-[var(--line)] bg-white text-[var(--muted)]"
                  }`}
                >
                  {photoUploadMessage}
                </p>
              )}
            </label>

            <div className="mt-2 flex flex-wrap gap-2 md:col-span-2">
              <button
                type="submit"
                disabled={isRouteSubmitDisabled}
                className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {routeCrudMode === "edit" ? "Zapisz zmiany trasy" : "Zapisz trasę"}
              </button>
              {editingRouteId && (
                <button
                  type="button"
                  onClick={resetRouteForm}
                  className="rounded-xl border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold"
                >
                  Anuluj edycję
                </button>
              )}
              <button
                type="button"
                onClick={resetRouteForm}
                className="rounded-xl border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold"
              >
                Wyczyść formularz
              </button>
            </div>

            {isRouteSubmitDisabled && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900 md:col-span-2">
                <p className="font-semibold">Aby odblokowac przycisk &quot;Zapisz trasę&quot;, uzupełnij:</p>
                {routeCrudMode === "edit" && !editingRouteId && <p className="mt-2">Wybierz trasę do edycji z listy powyżej.</p>}
                {missingRequiredFields.length > 0 && (
                  <ul className="mt-2 list-disc pl-5">
                    {missingRequiredFields.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {missingVerificationChecklist.length > 0 && (
                  <ul className="mt-2 list-disc pl-5">
                    {missingVerificationChecklist.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </form>
        )}

        {status === "saved" && (
          <p className="mt-3 rounded-xl border border-[var(--line)] bg-[#e7f5e8] px-3 py-2 text-sm text-[var(--muted)]">
            {statusMessage || "Trasa zapisana. Odśwież strone główna, aby zobaczyc ja na liscie."}
          </p>
        )}
        {status === "error" && (
          <p className="mt-3 rounded-xl border border-[var(--line)] bg-[#ffe9e2] px-3 py-2 text-sm text-[var(--muted)]">
            {statusMessage || "Sprawdź pola liczbowe: dystans, przewyższenie, wiek, asfalt i ocena."}
          </p>
        )}
      </section>

      <section
        id="saved-routes"
        className={`rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_10px_34px_rgba(16,32,22,.1)] md:p-8 ${hidden ? "hidden" : ""}`}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-bold">Opublikowane trasy (baza)</h2>
          <button
            type="button"
            onClick={exportRoutes}
            disabled={publishedRoutes.length === 0}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Eksportuj JSON
          </button>
        </div>

        {publishedRoutes.length === 0 ? (
          <p className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">
            Brak opublikowanych tras w bazie. Dodaj pierwszą trasę formularzem obok.
          </p>
        ) : (
          <ul className="grid gap-2">
            {publishedRoutes.map((route) => (
              <li key={route.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{route.name}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {route.region} | {route.distanceKm} km | ocena {route.rating}/5
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRouteCrudMode("edit");
                        fillFormFromRoute(route);
                      }}
                      className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs font-semibold"
                    >
                      Edytuj
                    </button>
                    <span className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-xs font-semibold text-[var(--muted)]">
                      Usuń w trybie: Usuń
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
