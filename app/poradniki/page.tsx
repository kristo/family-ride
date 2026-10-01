import type { Metadata } from "next";
import Link from "next/link";
import { AffiliateDisclosure } from "@/components/guides/AffiliateDisclosure";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { getAllGuides } from "@/lib/guides";
import { SITE_NAME, SITE_URL, jsonLdString } from "@/lib/site";

const title = "Poradniki: sprzęt i bezpieczeństwo na rowerze z dziećmi";
const description =
  "Jak wybrać fotelik rowerowy, przyczepkę, kask i rower dla dziecka. Praktyczne poradniki dla rodzin, które chcą ruszyć na trasę.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/poradniki" },
  openGraph: { title, description, type: "website", locale: "pl_PL", url: "/poradniki" },
};

export default function GuidesPage() {
  const guides = getAllGuides();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Poradniki", item: `${SITE_URL}/poradniki` },
    ],
  };

  return (
    <div className="min-h-screen bg-[var(--sand)] text-[var(--ink)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <SiteHeader solid />

      <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-28 md:px-8 md:pt-32">
        <header className="max-w-3xl">
          <h1 className="text-4xl leading-[1.05] font-extrabold [text-wrap:balance] md:text-6xl">Poradniki dla rodzin na rowerach</h1>
          <p className="mt-4 text-lg text-[var(--muted)]">{description}</p>
        </header>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/poradniki/${guide.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--accent-text)]">{guide.category}</p>
                <h2 className="mt-2 text-xl leading-tight font-bold">{guide.cardTitle}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{guide.description}</p>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <AffiliateDisclosure />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
