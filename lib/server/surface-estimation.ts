type LatLng = [number, number];

type OverpassWay = {
  type: "way";
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
};

type OverpassResponse = {
  elements?: OverpassWay[];
};

export type SurfaceEstimate = {
  asphaltPct: number;
  gravelPct: number;
  unknownPct: number;
  confidence: "low" | "medium" | "high";
  samplesMatched: number;
  samplesTotal: number;
  note: string;
};

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

function sampleTrackPoints(points: LatLng[], maxSamples = 120): LatLng[] {
  if (points.length <= maxSamples) {
    return points;
  }

  const step = Math.ceil(points.length / maxSamples);
  const sampled: LatLng[] = [];

  for (let index = 0; index < points.length; index += step) {
    sampled.push(points[index]);
  }

  if (sampled[sampled.length - 1] !== points[points.length - 1]) {
    sampled.push(points[points.length - 1]);
  }

  return sampled;
}

function getBoundingBox(points: LatLng[]) {
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;

  for (const [lat, lon] of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }

  const margin = 0.003;

  return {
    south: minLat - margin,
    west: minLon - margin,
    north: maxLat + margin,
    east: maxLon + margin,
  };
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function approximateMetersDistance(a: LatLng, b: LatLng): number {
  const earthRadius = 6371000;
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(b[1] - a[1]);

  const x = deltaLon * Math.cos((lat1 + lat2) / 2);
  const y = deltaLat;

  return Math.sqrt(x * x + y * y) * earthRadius;
}

function pointToSegmentDistanceMeters(point: LatLng, segmentStart: LatLng, segmentEnd: LatLng): number {
  const px = point[1];
  const py = point[0];
  const x1 = segmentStart[1];
  const y1 = segmentStart[0];
  const x2 = segmentEnd[1];
  const y2 = segmentEnd[0];

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return approximateMetersDistance(point, segmentStart);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const projected: LatLng = [y1 + t * dy, x1 + t * dx];

  return approximateMetersDistance(point, projected);
}

function classifySurface(tags?: Record<string, string>): "asphalt" | "gravel" | "unknown" {
  if (!tags) {
    return "unknown";
  }

  const surface = (tags.surface ?? "").toLowerCase();
  const tracktype = (tags.tracktype ?? "").toLowerCase();

  const asphaltLike = new Set([
    "asphalt",
    "paved",
    "concrete",
    "concrete:lanes",
    "concrete:plates",
    "paving_stones",
    "sett",
    "chipseal",
  ]);

  const gravelLike = new Set([
    "unpaved",
    "gravel",
    "fine_gravel",
    "compacted",
    "dirt",
    "earth",
    "ground",
    "sand",
    "mud",
    "woodchips",
    "pebblestone",
    "rock",
  ]);

  if (asphaltLike.has(surface)) {
    return "asphalt";
  }

  if (gravelLike.has(surface)) {
    return "gravel";
  }

  if (!surface && tracktype === "grade1") {
    return "asphalt";
  }

  if (!surface && ["grade2", "grade3", "grade4", "grade5"].includes(tracktype)) {
    return "gravel";
  }

  return "unknown";
}

function confidenceForMatchRatio(matchRatio: number): "low" | "medium" | "high" {
  if (matchRatio >= 0.72) {
    return "high";
  }
  if (matchRatio >= 0.45) {
    return "medium";
  }
  return "low";
}

async function fetchWaysForBbox(bbox: { south: number; west: number; north: number; east: number }): Promise<OverpassWay[]> {
  const query = `[out:json][timeout:25];\n(\n  way["highway"]["surface"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});\n  way["highway"]["tracktype"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});\n);\nout geom;`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as OverpassResponse;
    return (payload.elements ?? []).filter((element) => element.type === "way" && Array.isArray(element.geometry));
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function estimateSurfaceBreakdown(trackPoints: LatLng[]): Promise<SurfaceEstimate | null> {
  if (trackPoints.length < 2) {
    return null;
  }

  const sampled = sampleTrackPoints(trackPoints, 120);
  const bbox = getBoundingBox(sampled);
  const ways = await fetchWaysForBbox(bbox);

  if (ways.length === 0) {
    return null;
  }

  let asphalt = 0;
  let gravel = 0;
  let unknown = 0;
  let matched = 0;

  for (const point of sampled) {
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestWay: OverpassWay | null = null;

    for (const way of ways) {
      const geometry = way.geometry;
      if (!geometry || geometry.length < 2) {
        continue;
      }

      for (let index = 1; index < geometry.length; index += 1) {
        const segmentStart: LatLng = [geometry[index - 1].lat, geometry[index - 1].lon];
        const segmentEnd: LatLng = [geometry[index].lat, geometry[index].lon];
        const distance = pointToSegmentDistanceMeters(point, segmentStart, segmentEnd);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestWay = way;
        }
      }
    }

    if (!bestWay || bestDistance > 35) {
      unknown += 1;
      continue;
    }

    matched += 1;
    const klass = classifySurface(bestWay.tags);
    if (klass === "asphalt") {
      asphalt += 1;
    } else if (klass === "gravel") {
      gravel += 1;
    } else {
      unknown += 1;
    }
  }

  const total = sampled.length;
  if (total === 0) {
    return null;
  }

  const classified = asphalt + gravel;
  const asphaltPct = classified > 0 ? Math.round((asphalt / classified) * 100) : 0;
  const gravelPct = classified > 0 ? 100 - asphaltPct : 0;
  const unknownPct = Math.round((unknown / total) * 100);
  const matchRatio = matched / total;
  const confidence = confidenceForMatchRatio(matchRatio);

  return {
    asphaltPct,
    gravelPct,
    unknownPct,
    confidence,
    samplesMatched: matched,
    samplesTotal: total,
    note:
      confidence === "high"
        ? "Nawierzchnia oszacowana z wysokim pokryciem danych OSM."
        : confidence === "medium"
          ? "Nawierzchnia oszacowana, ale warto potwierdzić terenowo."
          : "Nawierzchnia oszacowana z niska pewnośćia. Potrzebna reczna weryfikacja.",
  };
}
