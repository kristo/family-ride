"use client";

import { CircleMarker, MapContainer, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import type { PitchPoint, PitchPointKind } from "@/lib/types";

export const POINT_KIND_LABELS: Record<PitchPointKind, string> = {
  start: "Start",
  stop: "Postój",
  attraction: "Atrakcja",
  food: "Jedzenie",
  warning: "Uwaga / trudny fragment",
};

const KIND_COLORS: Record<PitchPointKind, string> = {
  start: "#1b8a3c",
  stop: "#005f73",
  attraction: "#f05a24",
  food: "#b8860b",
  warning: "#c1121f",
};

type PointPickerMapClientProps = {
  points: PitchPoint[];
  onAdd: (lat: number, lng: number) => void;
};

function ClickHandler({ onAdd }: { onAdd: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onAdd(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export function PointPickerMapClient({ points, onAdd }: PointPickerMapClientProps) {
  return (
    <MapContainer center={[52.0, 19.4]} zoom={6} scrollWheelZoom className="h-full w-full">
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler onAdd={onAdd} />
      {points.map((point, index) => (
        <CircleMarker
          key={`${point.lat}-${point.lng}-${index}`}
          center={[point.lat, point.lng]}
          radius={9}
          pathOptions={{ color: "#fff", weight: 2, fillColor: KIND_COLORS[point.kind], fillOpacity: 1 }}
        >
          <Tooltip permanent direction="top" offset={[0, -6]}>
            {index + 1}. {point.label || POINT_KIND_LABELS[point.kind]}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
