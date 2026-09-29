"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { parseStravaActivityId } from "@/lib/client/admin-uploads";
import type { RouteSurfaceEstimate } from "@/lib/types";
import type { FormState, VerificationChecklist } from "./RoutesTab";

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

type StravaImportPanelProps = {
  stravaUrl: string;
  setForm: Dispatch<SetStateAction<FormState>>;
  setImportedFromStrava: Dispatch<SetStateAction<boolean>>;
  setVerificationChecklist: Dispatch<SetStateAction<VerificationChecklist>>;
  setImportedSurfaceEstimate: Dispatch<SetStateAction<RouteSurfaceEstimate | null>>;
  /** Wywoływane po udanym imporcie, żeby RoutesTab odświeżył listę plików GPX. */
  onGpxImported: () => void;
};

export function StravaImportPanel({
  stravaUrl,
  setForm,
  setImportedFromStrava,
  setVerificationChecklist,
  setImportedSurfaceEstimate,
  onGpxImported,
}: StravaImportPanelProps) {
  const [stravaStatus, setStravaStatus] = useState<StravaStatus>({ configured: false, connected: false });
  const [stravaLoading, setStravaLoading] = useState<boolean>(false);
  const [stravaActivities, setStravaActivities] = useState<StravaActivity[]>([]);
  const [stravaActivityFilter, setStravaActivityFilter] = useState<"ride" | "all">("ride");
  const [stravaActivitiesStatus, setStravaActivitiesStatus] = useState<"idle" | "loading" | "error">("idle");
  const [stravaMessage, setStravaMessage] = useState<string>("");

  const filteredStravaActivities = useMemo(() => {
    const sorted = [...stravaActivities].sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );

    if (stravaActivityFilter === "all") {
      return sorted;
    }

    return sorted.filter((activity) => activity.type.toLowerCase() === "ride");
  }, [stravaActivities, stravaActivityFilter]);

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

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadStravaStatus();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        mapEmbedUrl?: string | null;
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
        mapEmbedUrl: payload.mapEmbedUrl ?? prev.mapEmbedUrl,
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

      onGpxImported();
    } catch {
      setStravaMessage("Import aktywności nie powiódł się.");
    }
  };

  const importStravaFromUrl = async () => {
    const activityId = parseStravaActivityId(stravaUrl);
    if (!activityId) {
      setStravaMessage("Podaj poprawny link Strava (lub samo ID aktywności).");
      return;
    }

    await importStravaActivity(activityId);
  };

  return (
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
                  value={stravaUrl}
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
  );
}
