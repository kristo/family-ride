"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { PhotoStory, PhotoStoryPhoto, Route, RouteSubmission, RouteSurfaceEstimate } from "@/lib/types";

type FormState = {
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

const DEFAULT_BEST_MONTHS = ["maj", "czerwiec", "wrzesień"];
const DEFAULT_PACKING_LIST = ["kask", "bidony", "zapasowa detka"];

type GpxListItem = {
  name: string;
  url: string;
  sizeBytes: number;
  updatedAt: string;
};

type StravaAthlete = {
  id: number;
  firstname?: string;
  lastname?: string;
  username?: string;
};

type StravaStatus = {
  configured: boolean;
  connected: boolean;
  athlete?: StravaAthlete;
};

type StravaActivity = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  start_date: string;
  type: string;
};

type VerificationChecklist = {
  routeLineReviewed: boolean;
  metricsReviewed: boolean;
  logisticsReviewed: boolean;
  familySafetyReviewed: boolean;
};

type PhotoStoryForm = {
  title: string;
  tag: string;
  body: string;
};

const initialVerificationChecklist: VerificationChecklist = {
  routeLineReviewed: false,
  metricsReviewed: false,
  logisticsReviewed: false,
  familySafetyReviewed: false,
};

const initialPhotoStoryForm: PhotoStoryForm = {
  title: "Start bez pośpiechu",
  tag: "Warm-up",
  body:
    "Startujemy spokojnie i dajemy dzieciom czas na złapanie rytmu.\n\nPo około 30-40 minutach warto zrobić krótki postój na wodę i przekąskę, zanim pojawi się pierwsza zmiana tempa.\n\nW drugiej części trasy dobrze działa zasada: krótki odcinek jazdy i chwila aktywnej przerwy.",
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

const NETWORK_SAFE_UPLOAD_BYTES = 4 * 1024 * 1024;
const PRIMARY_PHOTO_MAX_DIMENSION = 2200;
const SECONDARY_PHOTO_MAX_DIMENSION = 1600;

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

  const directNumber = Number(source);
  if (Number.isFinite(directNumber) && directNumber > 0) {
    return directNumber;
  }

  try {
    const url = new URL(source);
    const match = url.pathname.match(/\/activities\/(\d+)/);
    if (!match) {
      return null;
    }

    const activityId = Number(match[1]);
    return Number.isFinite(activityId) && activityId > 0 ? activityId : null;
  } catch {
    return null;
  }
}

function fileNameWithJpg(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "") + ".jpg";
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

async function reencodeImage(file: File, maxDimension: number, quality: number): Promise<File | null> {
  const bitmap = await createImageBitmap(file);
  const maxSourceDimension = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, maxDimension / maxSourceDimension);

  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvasToJpegBlob(canvas, quality);
  if (!blob) {
    return null;
  }

  return new File([blob], fileNameWithJpg(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

async function preparePhotoForUpload(file: File): Promise<File> {
  const looksLikeHeic = /\.hei(c|f)$/i.test(file.name) || /image\/hei(c|f)/i.test(file.type);
  const mustCompress = looksLikeHeic || file.size > NETWORK_SAFE_UPLOAD_BYTES;

  if (!mustCompress) {
    return file;
  }

  const primary = await reencodeImage(file, PRIMARY_PHOTO_MAX_DIMENSION, 0.82);
  if (primary && primary.size <= NETWORK_SAFE_UPLOAD_BYTES) {
    return primary;
  }

  const secondarySource = primary ?? file;
  const secondary = await reencodeImage(secondarySource, SECONDARY_PHOTO_MAX_DIMENSION, 0.72);
  if (secondary && secondary.size <= NETWORK_SAFE_UPLOAD_BYTES) {
    return secondary;
  }

  throw new Error("Zdjęcie jest za duże do przesłania. Spróbuj mniejszy plik lub mocniejszą kompresję.");
}

export default function AdminPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [publishedRoutes, setPublishedRoutes] = useState<Route[]>([]);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [gpxFiles, setGpxFiles] = useState<GpxListItem[]>([]);
  const [gpxUploadStatus, setGpxUploadStatus] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [gpxUploadMessage, setGpxUploadMessage] = useState<string>("");
  const [photoUploadStatus, setPhotoUploadStatus] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [photoUploadMessage, setPhotoUploadMessage] = useState<string>("");
  const [videoUploadStatus, setVideoUploadStatus] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [videoUploadMessage, setVideoUploadMessage] = useState<string>("");
  const [stravaStatus, setStravaStatus] = useState<StravaStatus>({ configured: false, connected: false });
  const [stravaLoading, setStravaLoading] = useState<boolean>(false);
  const [stravaActivities, setStravaActivities] = useState<StravaActivity[]>([]);
  const [stravaActivityFilter, setStravaActivityFilter] = useState<"ride" | "all">("ride");
  const [stravaActivitiesStatus, setStravaActivitiesStatus] = useState<"idle" | "loading" | "error">("idle");
  const [stravaMessage, setStravaMessage] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [importedFromStrava, setImportedFromStrava] = useState<boolean>(false);
  const [verificationChecklist, setVerificationChecklist] = useState<VerificationChecklist>(initialVerificationChecklist);
  const [importedSurfaceEstimate, setImportedSurfaceEstimate] = useState<RouteSurfaceEstimate | null>(null);
  const [pendingSubmissions, setPendingSubmissions] = useState<RouteSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState<boolean>(false);
  const [moderationMessage, setModerationMessage] = useState<string>("");
  const [photoStories, setPhotoStories] = useState<PhotoStory[]>([]);
  const [photoStoriesLoading, setPhotoStoriesLoading] = useState<boolean>(false);
  const [photoStoriesMessage, setPhotoStoriesMessage] = useState<string>("");
  const [photoStoryForm, setPhotoStoryForm] = useState<PhotoStoryForm>(initialPhotoStoryForm);
  const [photoStoriesUploadStatus, setPhotoStoriesUploadStatus] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [photoStoriesUploadMessage, setPhotoStoriesUploadMessage] = useState<string>("");

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
  const filteredStravaActivities = useMemo(() => {
    const sorted = [...stravaActivities].sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );

    if (stravaActivityFilter === "all") {
      return sorted;
    }

    return sorted.filter((activity) => activity.type.toLowerCase() === "ride");
  }, [stravaActivities, stravaActivityFilter]);

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

  const fillFormFromRoute = (route: Route) => {
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
    setEditingRouteId(null);
    setForm(initialState);
    setVerificationChecklist(initialVerificationChecklist);
    setImportedFromStrava(false);
    setImportedSurfaceEstimate(null);
    setStatusMessage("");
    setStatus("idle");
  };

  const loadStravaStatus = async () => {
    setStravaLoading(true);
    try {
      const response = await fetch("/api/admin/strava/status", { method: "GET" });
      const payload = (await response.json()) as StravaStatus;
      setStravaStatus(payload);
      if (payload.connected) {
        void loadStravaActivities();
      } else {
        setStravaActivities([]);
      }
    } catch {
      setStravaStatus({ configured: false, connected: false });
      setStravaActivities([]);
    } finally {
      setStravaLoading(false);
    }
  };

  const loadPendingSubmissions = async () => {
    setSubmissionsLoading(true);
    try {
      const response = await fetch("/api/admin/submissions?status=pending", { method: "GET" });
      const payload = (await response.json()) as { submissions?: RouteSubmission[] };
      setPendingSubmissions(Array.isArray(payload.submissions) ? payload.submissions : []);
    } catch {
      setPendingSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const loadPublishedRoutes = async () => {
    try {
      const response = await fetch("/api/admin/routes", { method: "GET", cache: "no-store" });
      const payload = (await response.json()) as { routes?: Route[] };
      setPublishedRoutes(Array.isArray(payload.routes) ? payload.routes : []);
    } catch {
      setPublishedRoutes([]);
    }
  };

  const loadPhotoStories = async () => {
    setPhotoStoriesLoading(true);
    setPhotoStoriesMessage("");

    try {
      const response = await fetch("/api/admin/photo-stories", { method: "GET", cache: "no-store" });
      const payload = (await response.json()) as { stories?: PhotoStory[]; error?: string };

      if (!response.ok) {
        setPhotoStoriesMessage(payload.error ?? "Nie udało się pobrać Photo Stories.");
        setPhotoStories([]);
        return;
      }

      setPhotoStories(Array.isArray(payload.stories) ? payload.stories : []);
    } catch {
      setPhotoStoriesMessage("Nie udało się pobrać Photo Stories.");
      setPhotoStories([]);
    } finally {
      setPhotoStoriesLoading(false);
    }
  };

  const savePhotoStoriesList = async (nextStories: PhotoStory[]) => {
    setPhotoStoriesMessage("Zapisywanie Photo Stories...");

    try {
      const response = await fetch("/api/admin/photo-stories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stories: nextStories }),
      });

      const payload = (await response.json()) as { stories?: PhotoStory[]; error?: string };
      if (!response.ok) {
        setPhotoStoriesMessage(payload.error ?? "Nie udało się zapisać Photo Stories.");
        return;
      }

      const saved = Array.isArray(payload.stories) ? payload.stories : nextStories;
      setPhotoStories(saved);
      setPhotoStoriesMessage("Photo Stories zostały zapisane.");
    } catch {
      setPhotoStoriesMessage("Nie udało się zapisać Photo Stories.");
    }
  };

  const uploadPhotoStoryImages = async (files: FileList) => {
    const fileItems = Array.from(files);
    if (fileItems.length === 0) {
      return;
    }

    if (photoStoryForm.body.trim().length < 40) {
      setPhotoStoriesUploadStatus("error");
      setPhotoStoriesUploadMessage("Dodaj dłuższą treść historii (minimum 40 znaków), a potem prześlij zdjęcia.");
      return;
    }

    setPhotoStoriesUploadStatus("uploading");
    setPhotoStoriesUploadMessage("Wgrywanie zdjęć...");

    const createdStories: PhotoStory[] = [];

    for (const file of fileItems) {
      try {
        const preparedFile = await preparePhotoForUpload(file);
        const body = new FormData();
        body.append("file", preparedFile);

        const response = await fetch("/api/admin/media?kind=photo", {
          method: "POST",
          body,
        });

        const payload = (await response.json()) as { file?: { url?: string }; error?: string };
        if (!response.ok || !payload.file?.url) {
          throw new Error(payload.error ?? "Upload zdjęcia nie powiódł się.");
        }

        createdStories.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          src: payload.file.url,
          title: photoStoryForm.title.trim() || "Start bez pośpiechu",
          text: "",
          tag: photoStoryForm.tag.trim() || "Warm-up",
          body: photoStoryForm.body.trim() || undefined,
        });
      } catch (error) {
        setPhotoStoriesUploadStatus("error");
        setPhotoStoriesUploadMessage(error instanceof Error ? error.message : "Nie udało się przesłać zdjęć.");
        return;
      }
    }

    const nextStories = [...createdStories, ...photoStories];
    setPhotoStories(nextStories);
    await savePhotoStoriesList(nextStories);

    setPhotoStoriesUploadStatus("ok");
    setPhotoStoriesUploadMessage(`Dodano ${createdStories.length} zdjęć do Photo Stories.`);
    setPhotoStoryForm(initialPhotoStoryForm);
  };

  const uploadStoryGalleryImages = async (storyId: string, files: FileList) => {
    const fileItems = Array.from(files);
    if (fileItems.length === 0) {
      return;
    }

    setPhotoStoriesUploadStatus("uploading");
    setPhotoStoriesUploadMessage("Wgrywanie zdjęć do galerii...");

    const uploaded: PhotoStoryPhoto[] = [];

    for (const file of fileItems) {
      try {
        const preparedFile = await preparePhotoForUpload(file);
        const body = new FormData();
        body.append("file", preparedFile);

        const response = await fetch("/api/admin/media?kind=photo", {
          method: "POST",
          body,
        });

        const payload = (await response.json()) as { file?: { url?: string }; error?: string };
        if (!response.ok || !payload.file?.url) {
          throw new Error(payload.error ?? "Upload zdjęcia nie powiódł się.");
        }

        uploaded.push({ src: payload.file.url });
      } catch (error) {
        setPhotoStoriesUploadStatus("error");
        setPhotoStoriesUploadMessage(error instanceof Error ? error.message : "Nie udało się przesłać zdjęć.");
        return;
      }
    }

    setPhotoStories((prev) =>
      prev.map((story) => (story.id === storyId ? { ...story, photos: [...(story.photos ?? []), ...uploaded] } : story))
    );
    setPhotoStoriesUploadStatus("ok");
    setPhotoStoriesUploadMessage(`Dodano ${uploaded.length} zdjęć do galerii. Kliknij "Zapisz historie", aby opublikować.`);
  };

    const updateStoryGalleryPhoto = (storyId: string, photoIndex: number, changes: Partial<PhotoStoryPhoto>) => {
      setPhotoStories((prev) =>
        prev.map((story) =>
          story.id === storyId
            ? { ...story, photos: (story.photos ?? []).map((photo, index) => (index === photoIndex ? { ...photo, ...changes } : photo)) }
            : story
        )
      );
    };

  const removeStoryGalleryPhoto = (storyId: string, photoIndex: number) => {
    setPhotoStories((prev) =>
      prev.map((story) =>
        story.id === storyId ? { ...story, photos: (story.photos ?? []).filter((_, index) => index !== photoIndex) } : story
      )
    );
  };

  const updatePhotoStory = (id: string, changes: Partial<PhotoStory>) => {
    setPhotoStories((prev) => prev.map((story) => (story.id === id ? { ...story, ...changes } : story)));
  };

  const removePhotoStory = (id: string) => {
    setPhotoStories((prev) => prev.filter((story) => story.id !== id));
  };

  const connectStrava = async () => {
    setStravaMessage("");
    try {
      const response = await fetch("/api/admin/strava/connect", { method: "GET" });
      const payload = (await response.json()) as { authUrl?: string; error?: string };

      if (!response.ok || !payload.authUrl) {
        setStravaMessage(payload.error ?? "Nie udało się rozpocząć połączenia Strava.");
        return;
      }

      window.location.href = payload.authUrl;
    } catch {
      setStravaMessage("Nie udało się rozpocząć połączenia Strava.");
    }
  };

  const disconnectStrava = async () => {
    setStravaMessage("");
    try {
      const response = await fetch("/api/admin/strava/disconnect", { method: "POST" });
      if (!response.ok) {
        throw new Error("Rozłączenie nie powiodło się.");
      }
      setStravaActivities([]);
      await loadStravaStatus();
    } catch {
      setStravaMessage("Nie udało się rozłączyć konta Strava.");
    }
  };

  const loadStravaActivities = async () => {
    setStravaActivitiesStatus("loading");
    setStravaMessage("");
    try {
      const response = await fetch("/api/admin/strava/activities?perPage=25", { method: "GET" });
      const payload = (await response.json()) as { activities?: StravaActivity[]; error?: string };

      if (!response.ok) {
        setStravaActivitiesStatus("error");
        setStravaMessage(payload.error ?? "Nie udało się pobrać aktywności Strava.");
        return;
      }

      const activities = Array.isArray(payload.activities) ? payload.activities : [];
      activities.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
      setStravaActivities(activities);
      setStravaActivitiesStatus("idle");
    } catch {
      setStravaActivitiesStatus("error");
      setStravaMessage("Nie udało się pobrać aktywności Strava.");
    }
  };

  const importStravaActivity = async (activityId: number) => {
    setStravaMessage("Importuje aktywność do GPX...");
    try {
      const response = await fetch("/api/admin/strava/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ activityId }),
      });

      const payload = (await response.json()) as {
        error?: string;
        source?: string;
        activity?: { id?: number; name?: string };
        file?: { url?: string; name?: string };
        metrics?: { distanceKm?: number; elevationM?: number };
        surface?: RouteSurfaceEstimate | null;
      };

      if (!response.ok || !payload.file?.url) {
        setStravaMessage(payload.error ?? "Import aktywności nie powiódł się.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        name: prev.name.trim().length > 0 ? prev.name : (payload.activity?.name ?? prev.name),
        stravaUrl: prev.stravaUrl.trim(),
        gpxUrl: payload.file?.url ?? prev.gpxUrl,
        asphaltPct:
          typeof payload.surface?.asphaltPct === "number"
            ? String(payload.surface.asphaltPct)
            : prev.asphaltPct,
        distanceKm:
          typeof payload.metrics?.distanceKm === "number"
            ? String(payload.metrics.distanceKm)
            : prev.distanceKm,
        elevationM:
          typeof payload.metrics?.elevationM === "number"
            ? String(payload.metrics.elevationM)
            : prev.elevationM,
        verificationLevel: "verified",
      }));

      setImportedFromStrava(payload.source === "strava");
      setVerificationChecklist({
        routeLineReviewed: true,
        metricsReviewed: true,
        logisticsReviewed: false,
        familySafetyReviewed: false,
      });

      if (payload.surface) {
        setImportedSurfaceEstimate(payload.surface);
        const qualityLabel =
          payload.surface.confidence === "high"
            ? "wysoka"
            : payload.surface.confidence === "medium"
              ? "srednia"
              : "niska";

        setStravaMessage(
          `Zaimportowano: ${payload.file.name ?? "plik.gpx"}. Nawierzchnia: asfalt ${payload.surface.asphaltPct}% / szuter ${payload.surface.gravelPct}% (pewność: ${qualityLabel}).`
        );
      } else {
        setImportedSurfaceEstimate(null);
        setStravaMessage(`Zaimportowano: ${payload.file.name ?? "plik.gpx"}. Nie udało się automatycznie oszacować nawierzchni.`);
      }

      await loadGpxFiles();
    } catch {
      setStravaMessage("Import aktywności nie powiódł się.");
    }
  };

  const importStravaFromUrl = async () => {
    const activityId = parseStravaActivityId(form.stravaUrl);
    if (!activityId) {
      setStravaMessage("Podaj poprawny link Strava (lub samo ID aktywności).");
      return;
    }

    await importStravaActivity(activityId);
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadGpxFiles();
      void loadStravaStatus();
      void loadPendingSubmissions();
      void loadPublishedRoutes();
      void loadPhotoStories();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moderateSubmission = async (id: string, action: "approve" | "reject") => {
    setModerationMessage(action === "approve" ? "Zatwierdzam zgłoszenie..." : "Odrzucam zgłoszenie...");

    try {
      const response = await fetch(`/api/admin/submissions/${id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewedBy: "admin" }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setModerationMessage(payload.error ?? "Operacja moderacji nie powiodła się.");
        return;
      }

      setModerationMessage(action === "approve" ? "Zgłoszenie zatwierdzone i opublikowane." : "Zgłoszenie odrzucone.");
      await loadPendingSubmissions();
      await loadPublishedRoutes();
    } catch {
      setModerationMessage("Operacja moderacji nie powiodła się.");
    }
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
      const endpoint = editingRouteId ? `/api/admin/routes/${editingRouteId}` : "/api/admin/routes";
      const method = editingRouteId ? "PATCH" : "POST";

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
      setStatusMessage(editingRouteId ? "Zmiany trasy zostały zapisane." : "Trasa zapisana w bazie i opublikowana.");
      setStatus("saved");
      await loadPublishedRoutes();
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

      await loadPublishedRoutes();
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
    <div className="min-h-screen bg-[var(--sand)] px-5 py-10 text-[var(--ink)] md:px-10">
      <main className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section id="route-editor" className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_10px_34px_rgba(16,32,22,.1)] md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold md:text-4xl">Family Ride Admin</h1>
            <div className="flex flex-wrap gap-2">
              <Link href="/" className="rounded-xl border border-[var(--ink)] px-3 py-2 text-sm font-semibold hover:bg-black/5">
                Wróć na stronę główną
              </Link>
              <a href="/CONTENT_PLAYBOOK.md" className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold hover:bg-black/5">
                Otwórz playbook treści
              </a>
            </div>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Dodaj trasę bez edycji plików. Trasy zapisujemy w bazie (Vercel Blob) i publikujemy od razu na stronie głównej.
          </p>

          <nav className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.08em]" aria-label="Nawigacja panelu admina">
            <a href="#route-editor" className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 hover:bg-black/5">Edytor tras</a>
            <a href="#moderation-queue" className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 hover:bg-black/5">Moderacja</a>
            <a href="#photo-stories-admin" className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 hover:bg-black/5">Photo Stories</a>
            <a href="#saved-routes" className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 hover:bg-black/5">Opublikowane trasy</a>
          </nav>

          <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/85 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Integracja Strava</h2>
                <p className="text-sm text-[var(--muted)]">Połącz konto, wybierz aktywność i importuj ją do GPX jednym kliknięciem.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!stravaStatus.connected ? (
                  <button
                    type="button"
                    onClick={() => void connectStrava()}
                    className="rounded-xl border border-[var(--ink)] px-3 py-2 text-sm font-semibold transition hover:bg-black/5"
                    disabled={stravaLoading}
                  >
                    Połącz ze Strava
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void loadStravaActivities()}
                      className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:bg-black/5"
                      disabled={stravaActivitiesStatus === "loading"}
                    >
                      Odśwież aktywności
                    </button>
                    <button
                      type="button"
                      onClick={() => void disconnectStrava()}
                      className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold transition hover:bg-black/5"
                    >
                      Rozłącz
                    </button>
                  </>
                )}
              </div>
            </div>

            {!stravaStatus.configured && (
              <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Ustaw STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET i NEXT_PUBLIC_APP_URL w .env.local, aby wlaczyc integracje.
              </p>
            )}

            {stravaStatus.connected && (
              <p className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Połączono jako {stravaStatus.athlete?.firstname ?? stravaStatus.athlete?.username ?? "użytkownik"}.
              </p>
            )}

            {stravaMessage.length > 0 && (
              <p className="mt-3 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">{stravaMessage}</p>
            )}

            {stravaStatus.connected && (
              <div className="mt-4 grid gap-2">
                <div className="rounded-xl border border-[var(--line)] bg-white p-3">
                  <label className="grid gap-1 text-sm">
                    <span className="font-semibold">Link aktywności Strava (lub ID)</span>
                    <div className="flex gap-2">
                      <input
                        value={form.stravaUrl}
                        onChange={(e) => setForm((prev) => ({ ...prev, stravaUrl: e.target.value }))}
                        placeholder="https://www.strava.com/activities/123456789"
                        className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={() => void importStravaFromUrl()}
                        className="shrink-0 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold transition hover:bg-black/5"
                      >
                        Importuj z linku
                      </button>
                    </div>
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Ostatnie aktywności Strava</p>
                  <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <span>Pokaż:</span>
                    <select
                      value={stravaActivityFilter}
                      onChange={(event) => setStravaActivityFilter(event.target.value as "ride" | "all")}
                      className="rounded-lg border border-[var(--line)] bg-white px-2 py-1"
                    >
                      <option value="ride">Tylko Ride</option>
                      <option value="all">Wszystkie typy</option>
                    </select>
                  </label>
                </div>

                {stravaActivitiesStatus === "loading" && (
                  <p className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">
                    Ładowanie ostatnich aktywności...
                  </p>
                )}

                {stravaActivitiesStatus !== "loading" && filteredStravaActivities.length === 0 ? (
                  <p className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">
                    Brak aktywności dla wybranego filtra. Kliknij Odśwież aktywności lub zmień filtr.
                  </p>
                ) : (
                  filteredStravaActivities.map((activity) => (
                    <div key={activity.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold">{activity.name}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {activity.type} | {(activity.distance / 1000).toFixed(1)} km | {new Date(activity.start_date).toLocaleDateString("pl-PL")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void importStravaActivity(activity.id)}
                        className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold transition hover:bg-black/5"
                      >
                        Importuj GPX
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {editingRouteId && (
            <div className="mt-6 rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900">
              Edytujesz wybraną trasę. Po zapisaniu zmiany zostaną od razu opublikowane na stronie.
            </div>
          )}

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
                disabled={isSaveDisabled}
                className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {editingRouteId ? "Zapisz zmiany trasy" : "Zapisz trasę"}
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

            {isSaveDisabled && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900 md:col-span-2">
                <p className="font-semibold">Aby odblokowac przycisk &quot;Zapisz trasę&quot;, uzupełnij:</p>
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

        <section id="moderation-queue" className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_10px_34px_rgba(16,32,22,.1)] md:p-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold">Kolejka moderacji</h2>
            <button
              type="button"
              onClick={() => void loadPendingSubmissions()}
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold hover:bg-black/5"
            >
              Odśwież
            </button>
          </div>

          {moderationMessage.length > 0 && (
            <p className="mb-3 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">{moderationMessage}</p>
          )}

          {submissionsLoading ? (
            <p className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">Ładowanie zgłoszeń...</p>
          ) : pendingSubmissions.length === 0 ? (
            <p className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">Brak zgłoszeń oczekujacych na moderacje.</p>
          ) : (
            <ul className="grid gap-3">
              {pendingSubmissions.map((submission) => (
                <li key={submission.id} className="rounded-xl border border-[var(--line)] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{submission.draft.name}</p>
                      <p className="text-sm text-[var(--muted)]">
                        Autor: {submission.submitterName}
                        {submission.submitterEmail ? ` (${submission.submitterEmail})` : ""}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {submission.draft.region} | {submission.draft.distanceKm} km | status: {submission.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void moderateSubmission(submission.id, "approve")}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900"
                      >
                        Zatwierdz
                      </button>
                      <button
                        type="button"
                        onClick={() => void moderateSubmission(submission.id, "reject")}
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

        <section id="photo-stories-admin" className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_10px_34px_rgba(16,32,22,.1)] md:p-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold">Photo Stories</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void loadPhotoStories()}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold hover:bg-black/5"
              >
                Odśwież
              </button>
              <button
                type="button"
                onClick={() => void savePhotoStoriesList(photoStories)}
                className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
              >
                Zapisz historie
              </button>
            </div>
          </div>

          <p className="mb-4 text-sm text-[var(--muted)]">
            Każda historia ma jeden długi tekst artykułu i kilka zdjęć w galerii. Nie dodajemy oddzielnych opisów do pojedynczych zdjęć.
          </p>

          <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-white/80 p-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">Tytuł dla nowych zdjęć</span>
              <input
                value={photoStoryForm.title}
                onChange={(event) => setPhotoStoryForm((prev) => ({ ...prev, title: event.target.value }))}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                placeholder="Np. Przerwa, która resetuje dzień"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Tag</span>
              <input
                value={photoStoryForm.tag}
                onChange={(event) => setPhotoStoryForm((prev) => ({ ...prev, tag: event.target.value }))}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                placeholder="Np. Leśny postój"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Upload wielu zdjęć</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif"
                onChange={(event) => {
                  if (!event.target.files || event.target.files.length === 0) {
                    return;
                  }

                  void uploadPhotoStoryImages(event.target.files);
                  event.currentTarget.value = "";
                }}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">Treść artykułu (jeden długi tekst)</span>
              <textarea
                value={photoStoryForm.body}
                onChange={(event) => setPhotoStoryForm((prev) => ({ ...prev, body: event.target.value }))}
                className="min-h-40 rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                placeholder="Napisz pełną historię. Użyj pustej linii między akapitami (min. 40 znaków)."
              />
            </label>
          </div>

          {photoStoriesUploadStatus !== "idle" && (
            <p
              className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                photoStoriesUploadStatus === "ok"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : photoStoriesUploadStatus === "error"
                    ? "border-rose-300 bg-rose-50 text-rose-800"
                    : "border-[var(--line)] bg-white text-[var(--muted)]"
              }`}
            >
              {photoStoriesUploadMessage}
            </p>
          )}

          {photoStoriesMessage.length > 0 && (
            <p className="mt-3 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">{photoStoriesMessage}</p>
          )}

          {photoStoriesLoading ? (
            <p className="mt-3 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">Ładowanie Photo Stories...</p>
          ) : photoStories.length === 0 ? (
            <p className="mt-3 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">Brak historii. Dodaj pierwsze zdjęcia.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {photoStories.map((story, index) => (
                <li key={story.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
                  <div className="grid gap-3 md:grid-cols-[0.22fr_0.78fr]">
                    <div className="relative min-h-28 overflow-hidden rounded-lg border border-[var(--line)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={story.src} alt={story.title} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <div className="grid gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Pozycja {index + 1}</p>
                      <input
                        value={story.title}
                        onChange={(event) => updatePhotoStory(story.id, { title: event.target.value })}
                        className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                        placeholder="Tytuł: co i kiedy"
                      />
                      <input
                        value={story.tag}
                        onChange={(event) => updatePhotoStory(story.id, { tag: event.target.value })}
                        className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                        placeholder="Tag 1-2 słowa"
                      />
                      <input
                        value={story.src}
                        onChange={(event) => updatePhotoStory(story.id, { src: event.target.value })}
                        className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs"
                        placeholder="URL zdjęcia okładkowego"
                      />
                      <label className="grid gap-1 text-xs">
                        <span className="font-semibold">Treść artykułu (akapity oddziel pustą linią)</span>
                        <textarea
                          value={story.body ?? ""}
                          onChange={(event) => updatePhotoStory(story.id, { body: event.target.value })}
                          className="min-h-44 rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                          placeholder="Pełny opis historii widoczny na stronie artykułu."
                        />
                      </label>
                      <div className="grid gap-2 rounded-lg border border-[var(--line)] p-3">
                        <p className="text-xs font-semibold">
                          Galeria artykułu ({(story.photos?.length ?? 0) + 1} zdjęć razem z okładką)
                        </p>
                        {(story.photos ?? []).length > 0 && (
                          <ul className="grid gap-2">
                            {(story.photos ?? []).map((photo, photoIndex) => (
                              <li key={`${photo.src}-${photoIndex}`} className="grid grid-cols-[4rem_1fr_auto] items-center gap-2">
                                <div className="h-14 overflow-hidden rounded-md border border-[var(--line)]">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={photo.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                                </div>
                                <input
                                  value={photo.src}
                                  onChange={(event) => updateStoryGalleryPhoto(story.id, photoIndex, { src: event.target.value })}
                                  className="min-w-0 rounded-lg border border-[var(--line)] px-2 py-1.5 text-xs"
                                  placeholder="URL zdjęcia galerii"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeStoryGalleryPhoto(story.id, photoIndex)}
                                  className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-900"
                                  aria-label="Usuń zdjęcie z galerii"
                                >
                                  Usuń
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif"
                          onChange={(event) => {
                            if (!event.target.files || event.target.files.length === 0) {
                              return;
                            }

                            void uploadStoryGalleryImages(story.id, event.target.files);
                            event.currentTarget.value = "";
                          }}
                          className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
                          aria-label="Dodaj zdjęcia do galerii artykułu"
                        />
                      </div>
                      <a
                        href={`/stories/${story.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-fit text-xs font-semibold underline decoration-dotted"
                      >
                        Zobacz stronę artykułu
                      </a>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removePhotoStory(story.id)}
                          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900"
                        >
                          Usuń historię
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="saved-routes" className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_10px_34px_rgba(16,32,22,.1)] md:p-8">
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
                        onClick={() => fillFormFromRoute(route)}
                        className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs font-semibold"
                      >
                        Edytuj
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRoute(route.id)}
                        className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs font-semibold"
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
