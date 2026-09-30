export const SITE_NAME = "Family Ride";

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const SITE_DESCRIPTION =
  "Family Ride: sprawdzone trasy rowerowe dla rodzin z dziećmi, GPX, bezpieczeństwo i gotowe plany weekendowe.";

export function absoluteUrl(path: string): string {
  return /^https?:\/\//i.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// Meta description ma sens do ok. 155 znaków - dłuższe Google i tak ucina.
export function truncateDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) {
    return clean;
  }
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:\s-]+$/, "")}…`;
}

// JSON.stringify nie chroni przed "</script>" w treści - zamiana "<" na < to zalecany sposób.
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
