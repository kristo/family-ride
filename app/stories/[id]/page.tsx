import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Gallery, type GalleryPhoto } from "@/components/ui/Gallery";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { Photo } from "@/components/ui/Photo";
import { defaultPhotoStories } from "@/lib/default-photo-stories";
import { listPhotoStories } from "@/lib/server/photo-stories";
import { truncateDescription } from "@/lib/site";
import type { PhotoStory } from "@/lib/types";

// Historie edytuje się w adminie bez ponownego wdrożenia, więc strona nie może być statyczna.
export const dynamic = "force-dynamic";

type StoryPageProps = {
  params: Promise<{ id: string }>;
};

async function loadStories(): Promise<PhotoStory[]> {
  const stories = await listPhotoStories();
  return stories.length > 0 ? stories : defaultPhotoStories;
}

function storyGallery(story: PhotoStory): GalleryPhoto[] {
  return [
    { src: story.src, alt: story.title },
    ...(story.photos ?? []).map((photo, index) => ({
      src: photo.src,
      alt: photo.caption ?? `${story.title}: zdjęcie ${index + 2}`,
      caption: photo.caption,
    })),
  ];
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { id } = await params;
  const story = (await loadStories()).find((item) => item.id === id);

  if (!story) {
    return { title: "Historia nie znaleziona" };
  }

  return {
    title: story.title,
    description: truncateDescription(story.body ?? story.text),
    alternates: { canonical: `/stories/${story.id}` },
    openGraph: {
      title: story.title,
      description: truncateDescription(story.body ?? story.text),
      type: "article",
      locale: "pl_PL",
      url: `/stories/${story.id}`,
      images: [{ url: story.src }],
    },
  };
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { id } = await params;
  const stories = await loadStories();
  const story = stories.find((item) => item.id === id);

  if (!story) {
    notFound();
  }

  const paragraphs = (story.body ?? story.text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
  const photos = storyGallery(story);
  const others = stories.filter((item) => item.id !== story.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-[var(--sand)] text-[var(--ink)]">
      <SiteHeader solid />

      <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-28 md:px-8 md:pt-32">
        <Link href="/#stories" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--accent-text)] hover:underline">
          <ArrowRightIcon className="h-4 w-4 rotate-180" />
          Wszystkie historie
        </Link>

        <article>
          <header className="mt-6 max-w-3xl">
            <p className="inline-block rounded-full bg-[var(--sun)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#0c2f25]">
              {story.tag}
            </p>
            <h1 className="mt-4 text-4xl leading-[1.05] font-extrabold [text-wrap:balance] md:text-6xl">{story.title}</h1>
          </header>

          <section className="mt-10" aria-label="Galeria zdjęć">
            <Gallery photos={photos} />
            {photos.length > 1 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">Kliknij zdjęcie, aby je powiększyć. Zdjęć w galerii: {photos.length}.</p>
            ) : null}
          </section>

          {paragraphs.length > 0 ? (
            <div className="mx-auto mt-12 max-w-2xl space-y-5 text-lg leading-relaxed">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          ) : null}
        </article>

        {others.length > 0 ? (
          <section className="mt-20" aria-labelledby="more-stories">
            <h2 id="more-stories" className="text-2xl font-extrabold md:text-3xl">
              Zobacz też
            </h2>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((other) => (
                <li key={other.id}>
                  <Link href={`/stories/${other.id}`} className="group block overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)] transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Photo
                        src={other.src}
                        alt=""
                        sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--accent-text)]">{other.tag}</p>
                      <h3 className="mt-1 text-lg leading-tight font-bold">{other.title}</h3>
                    </div>
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
