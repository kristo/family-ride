// Liczy realny obszar (bounding box) trasy z punktów GPX i buduje z niego link do
// osadzonej mapy OpenStreetMap. Bez tego każda trasa dostawała ten sam, domyślny
// placeholder (bbox Kraków-Tarnów) wpisany na sztywno w formularzu admina, więc
// wszystkie kafelki na stronie głównej pokazywały identyczną mapkę.

export type LatLng = [number, number];

/** Wyciąga punkty lat/lon z tekstu GPX, niezależnie od kolejności atrybutów w <trkpt>. */
export function extractLatLngFromGpxText(content: string): LatLng[] {
  const points: LatLng[] = [];
  const trkptRegex = /<trkpt\b[^>]*>/gi;
  const latRegex = /\blat="(-?\d+(?:\.\d+)?)"/i;
  const lonRegex = /\blon="(-?\d+(?:\.\d+)?)"/i;

  for (const match of content.matchAll(trkptRegex)) {
    const tag = match[0];
    const lat = Number(tag.match(latRegex)?.[1]);
    const lon = Number(tag.match(lonRegex)?.[1]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      points.push([lat, lon]);
    }
  }

  return points;
}

/** Zwraca link do embed OSM wycentrowany na realnym przebiegu trasy, z niewielkim marginesem. */
export function buildOsmEmbedUrl(points: LatLng[]): string | null {
  if (points.length === 0) {
    return null;
  }

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

  if (!Number.isFinite(minLat) || !Number.isFinite(minLon)) {
    return null;
  }

  // Margines proporcjonalny do rozpiętości trasy (a nie stała wartość), żeby krótka pętla
  // nie ginęła w zbyt szerokim kadrze, a długa trasa miała jednak jakiś oddech przy krawędziach.
  const latSpan = maxLat - minLat;
  const lonSpan = maxLon - minLon;
  const latMargin = Math.max(latSpan * 0.15, 0.004);
  const lonMargin = Math.max(lonSpan * 0.15, 0.004);

  const south = minLat - latMargin;
  const north = maxLat + latMargin;
  const west = minLon - lonMargin;
  const east = maxLon + lonMargin;

  const bbox = `${west.toFixed(5)},${south.toFixed(5)},${east.toFixed(5)},${north.toFixed(5)}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`;
}
