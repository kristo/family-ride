"use client";

import dynamic from "next/dynamic";
import type { RouteDifficultyLevel } from "@/lib/route-difficulty";

type GpxMapProps = {
  gpxUrl: string;
  mapEmbedUrl?: string;
  className?: string;
  difficultyLevel?: RouteDifficultyLevel;
  distanceKm?: number;
  elevationM?: number;
};

const GpxMapClient = dynamic(
  () => import("@/components/maps/GpxMapClient").then((module) => module.GpxMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-[#eef3ef]">
        <div className="flex h-full items-center justify-center text-xs font-semibold text-[var(--muted)]">
          Ładowanie mapy...
        </div>
      </div>
    ),
  }
);

export function GpxMap(props: GpxMapProps) {
  return <GpxMapClient {...props} />;
}
