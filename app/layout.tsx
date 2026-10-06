import type { Metadata } from "next";
import Script from "next/script";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { MarketingConsent } from "@/components/marketing/MarketingConsent";
import { Analytics } from "@vercel/analytics/next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

// latin-ext jest potrzebne do polskich znaków (ą, ć, ę, ł, ń, ś, ź, ż).
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Family Ride",
    template: "%s | Family Ride",
  },
  description:
    "Family Ride: sprawdzone trasy rowerowe dla rodzin, GPX, bezpieczeństwo i gotowe plany weekendowe.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/family-ride-mark-256.png", sizes: "256x256", type: "image/png" },
      { url: "/family-ride-mark-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon-32x32.png"],
  },
  openGraph: {
    title: "Family Ride",
    description:
      "Sprawdzone trasy rowerowe dla rodzin: GPX, bezpieczeństwo, logistyka i gotowe plany weekendowe.",
    type: "website",
    locale: "pl_PL",
    images: [
      {
        url: "/og-family-ride-light.png",
        width: 1200,
        height: 630,
        alt: "Family Ride - trasy rowerowe dla rodzin",
      },
      {
        url: "/og-family-ride-dark.png",
        width: 1200,
        height: 630,
        alt: "Family Ride - trasy rowerowe dla rodzin (dark)",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Family Ride",
    description:
      "Sprawdzone trasy rowerowe dla rodzin: GPX, bezpieczeństwo, logistyka i gotowe plany weekendowe.",
    images: ["/og-family-ride-dark.png"],
  },
};

// Ustawia klasę .dark przed pierwszym renderem, żeby uniknąć błysku jasnego motywu.
const themeScript = `try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}`;
const consentBootstrapScript = `(function(){window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};window.gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});try{var c=localStorage.getItem('rwzd_marketing_consent_v1');if(c==='granted'||c==='denied'){window.gtag('consent','update',{ad_storage:c,analytics_storage:c,ad_user_data:c,ad_personalization:c});}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pl"
      className={`${manrope.variable} ${bricolage.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: consentBootstrapScript }} />
        {gtmId ? (
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`,
            }}
          />
        ) : null}
      </head>
      <body className="min-h-full flex flex-col">
        {gtmId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        ) : null}
        {children}
        <MarketingConsent />
        <Analytics />
      </body>
    </html>
  );
}
