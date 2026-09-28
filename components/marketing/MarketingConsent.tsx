"use client";

import Script from "next/script";
import { useEffect, useMemo, useState } from "react";

type ConsentState = "unknown" | "granted" | "denied";

const CONSENT_STORAGE_KEY = "rwzd_marketing_consent_v1";
const CONSENT_BANNER_DISMISSED_KEY = "rwzd_marketing_consent_banner_dismissed_v1";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    rwzdGtagInitialized?: boolean;
  }
}

function readStoredConsent(): ConsentState {
  if (typeof window === "undefined") {
    return "unknown";
  }

  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw === "granted" || raw === "denied") {
      return raw;
    }
  } catch {
    // Ignore local storage errors.
  }

  return "unknown";
}

function writeStoredConsent(state: Exclude<ConsentState, "unknown">): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, state);
  } catch {
    // Ignore local storage errors.
  }
}

function ensureGtag(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtagShim(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
}

function updateConsent(state: Exclude<ConsentState, "unknown">): void {
  ensureGtag();

  window.gtag?.("consent", "update", {
    ad_storage: state === "granted" ? "granted" : "denied",
    analytics_storage: state === "granted" ? "granted" : "denied",
    ad_user_data: state === "granted" ? "granted" : "denied",
    ad_personalization: state === "granted" ? "granted" : "denied",
  });
}

export function MarketingConsent() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID;
  const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const [consent, setConsent] = useState<ConsentState>(() => {
    if (typeof window === "undefined") {
      return "unknown";
    }
    return readStoredConsent();
  });
  const [isBannerOpen, setIsBannerOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      return window.sessionStorage.getItem(CONSENT_BANNER_DISMISSED_KEY) !== "1";
    } catch {
      return true;
    }
  });

  const hasTracking = useMemo(() => {
    return Boolean(
      (gtmId && gtmId.length > 0) ||
      (ga4Id && ga4Id.length > 0) ||
      (googleAdsId && googleAdsId.length > 0) ||
      (adsenseClient && adsenseClient.length > 0)
    );
  }, [adsenseClient, ga4Id, googleAdsId, gtmId]);

  useEffect(() => {
    if (!hasTracking) {
      return;
    }

    if (consent !== "unknown") {
      updateConsent(consent);
    }
  }, [consent, hasTracking]);

  const acceptAll = () => {
    writeStoredConsent("granted");
    updateConsent("granted");
    setConsent("granted");
    setIsBannerOpen(false);
  };

  const rejectAll = () => {
    writeStoredConsent("denied");
    updateConsent("denied");
    setConsent("denied");
    setIsBannerOpen(false);
  };

  const closeBanner = () => {
    setIsBannerOpen(false);

    if (typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.setItem(CONSENT_BANNER_DISMISSED_KEY, "1");
    } catch {
      // Ignore storage errors.
    }
  };

  if (!hasTracking) {
    return null;
  }

  const shouldLoadAdsense = Boolean(adsenseClient);

  return (
    <>
      {shouldLoadAdsense && adsenseClient ? (
        <Script
          id="adsense-script"
          strategy="afterInteractive"
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
          crossOrigin="anonymous"
        />
      ) : null}

      {consent === "unknown" && isBannerOpen && (
        <div className="consent-banner" role="dialog" aria-live="polite" aria-label="Ustawienia plików cookie">
          <p>
            Używamy cookies analitycznych i marketingowych, aby mierzyć skuteczność kampanii Google Ads i poprawiać
            działanie serwisu.
          </p>
          <div className="consent-actions">
            <button type="button" className="consent-btn consent-btn-muted" onClick={closeBanner}>
              Zamknij
            </button>
            <button type="button" className="consent-btn consent-btn-muted" onClick={rejectAll}>
              Odrzuć
            </button>
            <button type="button" className="consent-btn consent-btn-primary" onClick={acceptAll}>
              Akceptuję
            </button>
          </div>
        </div>
      )}
    </>
  );
}
