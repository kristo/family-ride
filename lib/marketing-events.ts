"use client";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function canTrack(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

export function trackNewsletterSignup(): void {
  if (!canTrack()) {
    return;
  }

  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const conversionLabel = process.env.NEXT_PUBLIC_GOOGLE_ADS_NEWSLETTER_LABEL;

  window.gtag?.("event", "sign_up", {
    method: "newsletter",
    source: "homepage",
  });

  if (adsId && conversionLabel) {
    window.gtag?.("event", "conversion", {
      send_to: `${adsId}/${conversionLabel}`,
    });
  }
}
