import type { RouteGpxQuality, RouteVerification, RouteVerificationLevel } from "@/lib/types";

export function verificationLabel(level: RouteVerificationLevel): string {
  if (level === "verified") {
    return "Zweryfikowana";
  }
  if (level === "community") {
    return "Do potwierdzenia";
  }
  return "Robocza";
}

export function verificationTone(level: RouteVerificationLevel): string {
  if (level === "verified") {
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }
  if (level === "community") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }
  return "border-slate-300 bg-slate-50 text-slate-700";
}

export function gpxQualityLabel(gpxQuality: RouteGpxQuality): string {
  if (gpxQuality === "full-track") {
    return "GPX: pełny ślad";
  }
  if (gpxQuality === "outline") {
    return "GPX: szkic";
  }
  return "GPX: brak";
}

export function verificationSummary(verification: RouteVerification): string {
  return `${verificationLabel(verification.level)} • ${gpxQualityLabel(verification.gpxQuality)}`;
}
