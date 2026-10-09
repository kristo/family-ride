import { describe, expect, it } from "vitest";
import { getRouteDifficultyLevel } from "./route-difficulty";

describe("getRouteDifficultyLevel", () => {
  it.each([
    // [opis, dystans km, przewyższenie m, min. wiek, oczekiwany poziom]
    ["krótka płaska trasa dla maluchów", 12, 40, 4, "easy"],
    ["20 km to tylko +1 punkt", 20, 0, 4, "easy"],
    ["30 km daje +2 punkty", 30, 0, 4, "medium"],
    ["7 m/km podjazdów i 20 km", 20, 140, 4, "medium"],
    ["długa i stroma", 30, 360, 6, "hard"],
    ["stroma krótka trasa dla starszych dzieci", 10, 120, 9, "medium"],
    ["20 km, 12 m/km i wiek 9+", 20, 240, 9, "hard"],
  ] as const)("%s → %s", (_label, distanceKm, elevationM, minAge, expected) => {
    expect(getRouteDifficultyLevel({ distanceKm, elevationM, minAge })).toBe(expected);
  });

  it("nie dzieli przez zero przy dystansie 0", () => {
    expect(getRouteDifficultyLevel({ distanceKm: 0, elevationM: 500, minAge: 3 })).toBe("easy");
  });
});
