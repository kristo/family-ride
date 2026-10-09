import { describe, expect, it } from "vitest";
import { buildOsmEmbedUrl, extractLatLngFromGpxText } from "./gpx-bbox";

function bboxOf(url: string): number[] {
  return decodeURIComponent(new URL(url).searchParams.get("bbox") ?? "")
    .split(",")
    .map(Number);
}

describe("extractLatLngFromGpxText", () => {
  it("czyta punkty niezależnie od kolejności atrybutów i ujemnych współrzędnych", () => {
    const gpx = `
      <gpx><trk><trkseg>
        <trkpt lat="50.0614" lon="19.9372"><ele>210</ele></trkpt>
        <trkpt lon="-0.1276" lat="51.5072"/>
        <TRKPT LAT="-33.8688" LON="151.2093"></TRKPT>
      </trkseg></trk></gpx>`;

    expect(extractLatLngFromGpxText(gpx)).toEqual([
      [50.0614, 19.9372],
      [51.5072, -0.1276],
      [-33.8688, 151.2093],
    ]);
  });

  it("pomija punkty bez kompletu współrzędnych i ignoruje waypointy", () => {
    const gpx = `
      <wpt lat="1" lon="1"/>
      <trkpt lat="50"/>
      <trkpt lat="50.1" lon="20.1"/>`;

    expect(extractLatLngFromGpxText(gpx)).toEqual([[50.1, 20.1]]);
  });

  it("zwraca pustą listę dla tekstu bez trkpt", () => {
    expect(extractLatLngFromGpxText("<gpx></gpx>")).toEqual([]);
  });
});

describe("buildOsmEmbedUrl", () => {
  it("zwraca null dla pustej listy punktów", () => {
    expect(buildOsmEmbedUrl([])).toBeNull();
  });

  it("buduje bbox w kolejności west,south,east,north z marginesem 15% rozpiętości", () => {
    const url = buildOsmEmbedUrl([
      [50, 19],
      [51, 21],
    ]);

    expect(url).toMatch(/^https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?bbox=.+&layer=mapnik$/);
    expect(bboxOf(url!)).toEqual([18.7, 49.85, 21.3, 51.15]);
  });

  it("dla bardzo krótkiej trasy stosuje minimalny margines 0.004", () => {
    const url = buildOsmEmbedUrl([[50, 20]]);

    expect(bboxOf(url!)).toEqual([19.996, 49.996, 20.004, 50.004]);
  });
});
