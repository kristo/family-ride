"use client";

import dynamic from "next/dynamic";
import type { PitchPoint } from "@/lib/types";

const PointPickerMapClient = dynamic(() => import("@/components/maps/PointPickerMapClient").then((module) => module.PointPickerMapClient), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#eef3ef] text-xs font-semibold text-[var(--muted)]">Ładowanie mapy...</div>
  ),
});

export function PointPickerMap(props: { points: PitchPoint[]; onAdd: (lat: number, lng: number) => void }) {
  return <PointPickerMapClient {...props} />;
}
