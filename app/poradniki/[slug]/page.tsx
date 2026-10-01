import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AffiliateDisclosure } from "@/components/guides/AffiliateDisclosure";
import { ProductCard } from "@/components/guides/ProductCard";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { getAllGuides, getGuideBySlug, getLiveProducts } from "@/lib/guides";
import { SITE_NAME, SITE_URL, jsonLdString, truncateDescription } from "@/lib/site";

export const dynamicParams = false;

type GuidePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllGuides().map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) {
    return { title: "Poradnik nie znaleziony" };
  }

  const description = truncateDescription(guide.description);
  return {
    title: guide.title,
    description,
    alternates: { canonical: `/poradniki/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description,
      type: "article",
      locale: "pl_PL",
      url: `/poradniki/${guide.slug}`,
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
    },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) {
    notFound();
  }

  const products = getLiveProducts(guide);
  const others = getAllGuides().filter((item) => item.slug !== guide.slug).slice(0, 3);
  const url = `${SITE_URL}/poradniki/${guide.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Poradniki", item: `${SITE_URL}/poradniki` },
          { "@type": "ListItem", position: 3, name: guide.cardTitle, item: url },
        ],
      },
      {
        "@type": "Article",
        headline: guide.title,
        description: guide.description,
        inLanguage: "pl-PL",
        mainEntityOfPage: url,
        datePublished: guide.publishedAt,
        dateModified: guide.updatedAt,
        author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      },
      {
        "@type": "FAQPage",
        mainEntity: guide.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[var(--sand)] text-[var(--ink)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <SiteHeader solid />

      <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-28 md:px-8 md:pt-32">
        <Link href="/poradniki" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--accent-text)] hover:underline">
          <ArrowRightIcon className="h-4 w-4 rotate-180" />
          Wszystkie poradniki
        </Link>

        <article className="mx-auto mt-6 max-w-2xl">
          <header>
            <p className="inline-block rounded-full bg-[var(--sun)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#0c2f25]">
              {guide.category}
            </p>
            <h1 className="mt-4 text-4xl leading-[1.05] font-extrabold [text-wrap:balance] md:text-5xl">{guide.title}</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">Aktualizacja: {guide.updatedAt}</p>
            {products.length > 0 ? (
              <div className="mt-5">
                <AffiliateDisclosure />
              </div>
            ) : null}
            <p className="mt-6 text-lg leading-relaxed">{guide.intro}</p>
          </header>

          {guide.sections.map((section) => (
            <section key={section.heading} className="mt-10">
              <h2 className="text-2xl font-extrabold md:text-3xl">{section.heading}</h2>
              <div className="mt-4 space-y-4 text-lg leading-relaxed">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.bullets ? (
                <ul className="mt-4 list-disc space-y-2 pl-6 text-lg leading-relaxed">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          {products.length > 0 ? (
            <section className="mt-12" aria-labelledby="polecane">
              <h2 id="polecane" className="text-2xl font-extrabold md:text-3xl">
                {guide.productsHeading ?? "Polecane produkty"}
              </h2>
              <ul className="mt-5 space-y-4">
                {products.map((product) => (
                  <ProductCard key={product.affiliateUrl} product={product} />
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-12" aria-labelledby="faq">
            <h2 id="faq" className="text-2xl font-extrabold md:text-3xl">
              Najczęstsze pytania
            </h2>
            <dl className="mt-5 space-y-5">
              {guide.faq.map((item) => (
                <div key={item.question}>
                  <dt className="text-lg font-bold">{item.question}</dt>
                  <dd className="mt-1 text-lg leading-relaxed text-[var(--muted)]">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </article>

        {others.length > 0 ? (
          <section className="mt-20" aria-labelledby="more-guides">
            <h2 id="more-guides" className="text-2xl font-extrabold md:text-3xl">
              Zobacz też
            </h2>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={`/poradniki/${other.slug}`}
                    className="block h-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--accent-text)]">{other.category}</p>
                    <h3 className="mt-1 text-lg leading-tight font-bold">{other.cardTitle}</h3>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
