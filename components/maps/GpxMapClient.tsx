"use client";

import { useEffect, useMemo, useState } from "react";
import { latLngBounds, type LatLngTuple } from "leaflet";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { RouteDifficultyLevel } from "@/lib/route-difficulty";

type GpxMapClientProps = {
  gpxUrl: string;
  mapEmbedUrl?: string;
  className?: string;
  difficultyLevel?: RouteDifficultyLevel;
  distanceKm?: number;
  elevationM?: number;
};

type GpxState =
  | { status: "loading" }
  | { status: "ready"; points: LatLngTuple[] }
  | { status: "error"; message: string };

function FitTrackBounds({ points }: { points: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) {
      return;
    }

    const bounds = latLngBounds(points);
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, points]);

  return null;
}

function parseGpxPoints(gpxText: string): LatLngTuple[] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(gpxText, "application/xml");

  const parserError = xml.querySelector("parsererror");
  if (parserError) {
    throw new Error("Nie udało się odczytać pliku GPX.");
  }

  const trkPts = Array.from(xml.getElementsByTagName("trkpt"));
  const fallbackTrkPts = trkPts.length > 0 ? trkPts : Array.from(xml.getElementsByTagNameNS("*", "trkpt"));

  return fallbackTrkPts
    .map((element) => {
      const lat = Number(element.getAttribute("lat"));
      const lon = Number(element.getAttribute("lon"));
      return [lat, lon] as LatLngTuple;
    })
    .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
}

export function GpxMapClient({
  gpxUrl,
  mapEmbedUrl,
  className,
  difficultyLevel,
  distanceKm,
  elevationM,
}: GpxMapClientProps) {
  const [gpxState, setGpxState] = useState<GpxState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    const loadGpx = async () => {
      setGpxState({ status: "loading" });

      try {
        const response = await fetch(gpxUrl, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Brak pliku GPX.");
        }

        const gpxText = await response.text();
        const points = parseGpxPoints(gpxText);

        if (points.length < 2) {
          throw new Error("Plik GPX nie zawiera śladu trasy.");
        }

        setGpxState({ status: "ready", points });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Nie udało się załadować śladu GPX.";
        setGpxState({ status: "error", message });
      }
    };

    void loadGpx();

    return () => {
      controller.abort();
    };
  }, [gpxUrl]);

  const fallbackMap = useMemo(() => {
    if (!mapEmbedUrl) {
      return null;
    }

    return (
      <iframe
        title="Podglad mapy trasy"
        src={mapEmbedUrl}
        className="h-full w-full"
        loading="lazy"
      />
    );
  }, [mapEmbedUrl]);

  if (gpxState.status === "loading") {
    return (
      <div className={`h-full w-full bg-[#eef3ef] ${className ?? ""}`}>
        <div className="flex h-full items-center justify-center text-xs font-semibold text-[var(--muted)]">
          Ładowanie śladu GPX...
        </div>
      </div>
    );
  }

  if (gpxState.status === "error") {
    if (fallbackMap) {
      return <div className={`h-full w-full ${className ?? ""}`}>{fallbackMap}</div>;
    }

    return (
      <div className={`h-full w-full bg-[#fff4e8] ${className ?? ""}`}>
        <div className="flex h-full items-center justify-center px-4 text-center text-xs font-semibold text-[var(--muted)]">
          {gpxState.message}
        </div>
      </div>
    );
  }

  const center = gpxState.points[0];
  const finish = gpxState.points[gpxState.points.length - 1];

  const { color, label } =
    difficultyLevel === "hard"
      ? { color: "#b42318", label: "Trudna" }
      : difficultyLevel === "medium"
        ? { color: "#b54708", label: "Średnia" }
        : { color: "#087443", label: "Łatwa" };

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={gpxState.points} pathOptions={{ color, weight: 5, opacity: 0.88 }} />

        <CircleMarker center={center} radius={6} pathOptions={{ color: "#0b3d2e", weight: 2, fillColor: "#22c55e", fillOpacity: 1 }}>
          <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
            Start
          </Tooltip>
        </CircleMarker>

        <CircleMarker center={finish} radius={6} pathOptions={{ color: "#4c0519", weight: 2, fillColor: "#f97316", fillOpacity: 1 }}>
          <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
            Meta
          </Tooltip>
        </CircleMarker>

        <FitTrackBounds points={gpxState.points} />
      </MapContainer>

      <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-[var(--line)] bg-white/92 px-2 py-1 text-[10px] font-semibold text-[var(--muted)] shadow-sm">
        <div>Trudność: {label}</div>
        {typeof distanceKm === "number" && <div>Dystans: {distanceKm} km</div>}
        {typeof elevationM === "number" && <div>Przewyższenie: {elevationM} m</div>}
      </div>
    </div>
  );
}
