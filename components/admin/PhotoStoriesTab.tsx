"use client";

import { useEffect, useState } from "react";
import { preparePhotoForUpload } from "@/lib/client/admin-uploads";
import type { PhotoStory, PhotoStoryPhoto } from "@/lib/types";

type PhotoStoriesTabProps = {
  hidden: boolean;
};

type PhotoStoryForm = {
  title: string;
  tag: string;
  body: string;
};

const initialPhotoStoryForm: PhotoStoryForm = {
  title: "Start bez pośpiechu",
  tag: "Warm-up",
  body:
    "Startujemy spokojnie i dajemy dzieciom czas na złapanie rytmu.\n\nPo około 30-40 minutach warto zrobić krótki postój na wodę i przekąskę, zanim pojawi się pierwsza zmiana tempa.\n\nW drugiej części trasy dobrze działa zasada: krótki odcinek jazdy i chwila aktywnej przerwy.",
};

export function PhotoStoriesTab({ hidden }: PhotoStoriesTabProps) {
  const [photoStories, setPhotoStories] = useState<PhotoStory[]>([]);
  const [photoStoriesLoading, setPhotoStoriesLoading] = useState<boolean>(false);
  const [photoStoriesMessage, setPhotoStoriesMessage] = useState<string>("");
  const [photoStoryForm, setPhotoStoryForm] = useState<PhotoStoryForm>(initialPhotoStoryForm);
  const [photoStoriesUploadStatus, setPhotoStoriesUploadStatus] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [photoStoriesUploadMessage, setPhotoStoriesUploadMessage] = useState<string>("");

  const loadPhotoStories = async () => {
    setPhotoStoriesLoading(true);
    setPhotoStoriesMessage("");

    try {
      const response = await fetch("/api/admin/photo-stories", { method: "GET", cache: "no-store" });
      const payload = (await response.json()) as { stories?: PhotoStory[]; error?: string };

      if (!response.ok) {
        setPhotoStoriesMessage(payload.error ?? "Nie udało się pobrać Photo Stories.");
        setPhotoStories([]);
        return;
      }

      setPhotoStories(Array.isArray(payload.stories) ? payload.stories : []);
    } catch {
      setPhotoStoriesMessage("Nie udało się pobrać Photo Stories.");
      setPhotoStories([]);
    } finally {
      setPhotoStoriesLoading(false);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadPhotoStories();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  const savePhotoStoriesList = async (nextStories: PhotoStory[]) => {
    setPhotoStoriesMessage("Zapisywanie Photo Stories...");

    try {
      const response = await fetch("/api/admin/photo-stories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stories: nextStories }),
      });

      const payload = (await response.json()) as { stories?: PhotoStory[]; error?: string };
      if (!response.ok) {
        setPhotoStoriesMessage(payload.error ?? "Nie udało się zapisać Photo Stories.");
        return;
      }

      const saved = Array.isArray(payload.stories) ? payload.stories : nextStories;
      setPhotoStories(saved);
      setPhotoStoriesMessage("Photo Stories zostały zapisane.");
    } catch {
      setPhotoStoriesMessage("Nie udało się zapisać Photo Stories.");
    }
  };

  const uploadPhotoStoryImages = async (files: FileList) => {
    const fileItems = Array.from(files);
    if (fileItems.length === 0) {
      return;
    }

    if (photoStoryForm.body.trim().length < 40) {
      setPhotoStoriesUploadStatus("error");
      setPhotoStoriesUploadMessage("Dodaj dłuższą treść historii (minimum 40 znaków), a potem prześlij zdjęcia.");
      return;
    }

    setPhotoStoriesUploadStatus("uploading");
    setPhotoStoriesUploadMessage("Wgrywanie zdjęć...");

    // Wszystkie wybrane pliki trafiają do JEDNEJ nowej historii: pierwszy plik jest
    // okładką (story.src), reszta idzie do galerii (story.photos). Wcześniej każdy
    // plik tworzył osobną, zduplikowaną historię z tym samym tytułem i tekstem.
    const uploadedUrls: string[] = [];

    for (const file of fileItems) {
      try {
        const preparedFile = await preparePhotoForUpload(file);
        const body = new FormData();
        body.append("file", preparedFile);

        const response = await fetch("/api/admin/media?kind=photo", {
          method: "POST",
          body,
        });

        const payload = (await response.json()) as { file?: { url?: string }; error?: string };
        if (!response.ok || !payload.file?.url) {
          throw new Error(payload.error ?? "Upload zdjęcia nie powiódł się.");
        }

        uploadedUrls.push(payload.file.url);
      } catch (error) {
        setPhotoStoriesUploadStatus("error");
        setPhotoStoriesUploadMessage(error instanceof Error ? error.message : "Nie udało się przesłać zdjęć.");
        return;
      }
    }

    const [coverUrl, ...galleryUrls] = uploadedUrls;
    const newStory: PhotoStory = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      src: coverUrl,
      title: photoStoryForm.title.trim() || "Start bez pośpiechu",
      text: "",
      tag: photoStoryForm.tag.trim() || "Warm-up",
      body: photoStoryForm.body.trim() || undefined,
      photos: galleryUrls.map((src) => ({ src })),
    };

    const nextStories = [newStory, ...photoStories];
    setPhotoStories(nextStories);
    await savePhotoStoriesList(nextStories);

    setPhotoStoriesUploadStatus("ok");
    setPhotoStoriesUploadMessage(
      `Dodano nową historię z ${uploadedUrls.length} ${uploadedUrls.length === 1 ? "zdjęciem" : "zdjęciami"}.`
    );
    setPhotoStoryForm(initialPhotoStoryForm);
  };

  const uploadStoryGalleryImages = async (storyId: string, files: FileList) => {
    const fileItems = Array.from(files);
    if (fileItems.length === 0) {
      return;
    }

    setPhotoStoriesUploadStatus("uploading");
    setPhotoStoriesUploadMessage("Wgrywanie zdjęć do galerii...");

    const uploaded: PhotoStoryPhoto[] = [];

    for (const file of fileItems) {
      try {
        const preparedFile = await preparePhotoForUpload(file);
        const body = new FormData();
        body.append("file", preparedFile);

        const response = await fetch("/api/admin/media?kind=photo", {
          method: "POST",
          body,
        });

        const payload = (await response.json()) as { file?: { url?: string }; error?: string };
        if (!response.ok || !payload.file?.url) {
          throw new Error(payload.error ?? "Upload zdjęcia nie powiódł się.");
        }

        uploaded.push({ src: payload.file.url });
      } catch (error) {
        setPhotoStoriesUploadStatus("error");
        setPhotoStoriesUploadMessage(error instanceof Error ? error.message : "Nie udało się przesłać zdjęć.");
        return;
      }
    }

    setPhotoStories((prev) =>
      prev.map((story) => (story.id === storyId ? { ...story, photos: [...(story.photos ?? []), ...uploaded] } : story))
    );
    setPhotoStoriesUploadStatus("ok");
    setPhotoStoriesUploadMessage(`Dodano ${uploaded.length} zdjęć do galerii. Kliknij "Zapisz historie", aby opublikować.`);
  };

  const updateStoryGalleryPhoto = (storyId: string, photoIndex: number, changes: Partial<PhotoStoryPhoto>) => {
    setPhotoStories((prev) =>
      prev.map((story) =>
        story.id === storyId
          ? { ...story, photos: (story.photos ?? []).map((photo, index) => (index === photoIndex ? { ...photo, ...changes } : photo)) }
          : story
      )
    );
  };

  const removeStoryGalleryPhoto = (storyId: string, photoIndex: number) => {
    const nextStories = photoStories.map((story) =>
      story.id === storyId ? { ...story, photos: (story.photos ?? []).filter((_, index) => index !== photoIndex) } : story
    );
    setPhotoStories(nextStories);
    // Usunięcie to akcja bezpowrotna, więc zapisujemy od razu, zamiast czekać na "Zapisz historie".
    void savePhotoStoriesList(nextStories);
  };

  const updatePhotoStory = (id: string, changes: Partial<PhotoStory>) => {
    setPhotoStories((prev) => prev.map((story) => (story.id === id ? { ...story, ...changes } : story)));
  };

  const removePhotoStory = (id: string) => {
    const nextStories = photoStories.filter((story) => story.id !== id);
    setPhotoStories(nextStories);
    // Usunięcie to akcja bezpowrotna, więc zapisujemy od razu, zamiast czekać na "Zapisz historie".
    void savePhotoStoriesList(nextStories);
  };

  return (
    <section
      id="photo-stories-admin"
      className={`rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_10px_34px_rgba(16,32,22,.1)] md:p-8 ${hidden ? "hidden" : ""}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Photo Stories</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadPhotoStories()}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold hover:bg-black/5"
          >
            Odśwież
          </button>
          <button
            type="button"
            onClick={() => void savePhotoStoriesList(photoStories)}
            className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
          >
            Zapisz historie
          </button>
        </div>
      </div>

      <p className="mb-4 text-sm text-[var(--muted)]">
        Każda historia ma jeden długi tekst artykułu i galerię zdjęć. Każde zdjęcie w galerii może mieć swój podpis.
        Usuwanie zapisuje się od razu, edycja tekstu wymaga kliknięcia &quot;Zapisz historie&quot;.
      </p>

      <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-white/80 p-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm md:col-span-2">
          <span className="font-semibold">Tytuł dla nowych zdjęć</span>
          <input
            value={photoStoryForm.title}
            onChange={(event) => setPhotoStoryForm((prev) => ({ ...prev, title: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Np. Przerwa, która resetuje dzień"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Tag</span>
          <input
            value={photoStoryForm.tag}
            onChange={(event) => setPhotoStoryForm((prev) => ({ ...prev, tag: event.target.value }))}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Np. Leśny postój"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Nowa historia: dodaj zdjęcia</span>
          <span className="text-xs font-normal text-[var(--muted)]">
            Zaznacz od razu wszystkie zdjęcia tej historii. Pierwsze będzie okładką, reszta trafi do galerii - podpisy
            do zdjęć dodasz niżej, na liście historii.
          </span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif"
            onChange={(event) => {
              if (!event.target.files || event.target.files.length === 0) {
                return;
              }

              void uploadPhotoStoryImages(event.target.files);
              event.currentTarget.value = "";
            }}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          <span className="font-semibold">Treść artykułu (jeden długi tekst)</span>
          <textarea
            value={photoStoryForm.body}
            onChange={(event) => setPhotoStoryForm((prev) => ({ ...prev, body: event.target.value }))}
            className="min-h-40 rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            placeholder="Napisz pełną historię. Użyj pustej linii między akapitami (min. 40 znaków)."
          />
        </label>
      </div>

      {photoStoriesUploadStatus !== "idle" && (
        <p
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            photoStoriesUploadStatus === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : photoStoriesUploadStatus === "error"
                ? "border-rose-300 bg-rose-50 text-rose-800"
                : "border-[var(--line)] bg-white text-[var(--muted)]"
          }`}
        >
          {photoStoriesUploadMessage}
        </p>
      )}

      {photoStoriesMessage.length > 0 && (
        <p className="mt-3 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">{photoStoriesMessage}</p>
      )}

      {photoStoriesLoading ? (
        <p className="mt-3 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">Ładowanie Photo Stories...</p>
      ) : photoStories.length === 0 ? (
        <p className="mt-3 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">Brak historii. Dodaj pierwsze zdjęcia.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {photoStories.map((story, index) => (
            <li key={story.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
              <div className="grid gap-3 md:grid-cols-[0.22fr_0.78fr]">
                <div className="relative min-h-28 overflow-hidden rounded-lg border border-[var(--line)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={story.src} alt={story.title} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="grid gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Pozycja {index + 1}</p>
                  <input
                    value={story.title}
                    onChange={(event) => updatePhotoStory(story.id, { title: event.target.value })}
                    className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                    placeholder="Tytuł: co i kiedy"
                  />
                  <input
                    value={story.tag}
                    onChange={(event) => updatePhotoStory(story.id, { tag: event.target.value })}
                    className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                    placeholder="Tag 1-2 słowa"
                  />
                  <input
                    value={story.src}
                    onChange={(event) => updatePhotoStory(story.id, { src: event.target.value })}
                    className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs"
                    placeholder="URL zdjęcia okładkowego"
                  />
                  <label className="grid gap-1 text-xs">
                    <span className="font-semibold">Treść artykułu (akapity oddziel pustą linią)</span>
                    <textarea
                      value={story.body ?? ""}
                      onChange={(event) => updatePhotoStory(story.id, { body: event.target.value })}
                      className="min-h-44 rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                      placeholder="Pełny opis historii widoczny na stronie artykułu."
                    />
                  </label>
                  <div className="grid gap-2 rounded-lg border border-[var(--line)] p-3">
                    <p className="text-xs font-semibold">
                      Galeria artykułu ({(story.photos?.length ?? 0) + 1} zdjęć razem z okładką)
                    </p>
                    {(story.photos ?? []).length > 0 && (
                      <ul className="grid gap-2">
                        {(story.photos ?? []).map((photo, photoIndex) => (
                          <li key={`${photo.src}-${photoIndex}`} className="grid grid-cols-[4rem_1fr_auto] items-start gap-2">
                            <div className="h-14 overflow-hidden rounded-md border border-[var(--line)]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                            </div>
                            <div className="grid min-w-0 gap-1">
                              <input
                                value={photo.caption ?? ""}
                                onChange={(event) => updateStoryGalleryPhoto(story.id, photoIndex, { caption: event.target.value })}
                                className="min-w-0 rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
                                placeholder="Podpis zdjęcia (opcjonalnie)"
                              />
                              <input
                                value={photo.src}
                                onChange={(event) => updateStoryGalleryPhoto(story.id, photoIndex, { src: event.target.value })}
                                className="min-w-0 rounded-lg border border-[var(--line)] px-2 py-1 font-mono text-[11px] text-[var(--muted)]"
                                placeholder="URL zdjęcia"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeStoryGalleryPhoto(story.id, photoIndex)}
                              className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-900"
                              aria-label="Usuń zdjęcie z galerii"
                            >
                              Usuń
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif"
                      onChange={(event) => {
                        if (!event.target.files || event.target.files.length === 0) {
                          return;
                        }

                        void uploadStoryGalleryImages(story.id, event.target.files);
                        event.currentTarget.value = "";
                      }}
                      className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
                      aria-label="Dodaj zdjęcia do galerii artykułu"
                    />
                  </div>
                  <a
                    href={`/stories/${story.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-fit text-xs font-semibold underline decoration-dotted"
                  >
                    Zobacz stronę artykułu
                  </a>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removePhotoStory(story.id)}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900"
                    >
                      Usuń historię
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {photoStories.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void savePhotoStoriesList(photoStories)}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
          >
            Zapisz historie
          </button>
        </div>
      )}
    </section>
  );
}
