import type { PhotoStory } from "@/lib/types";

// Wyświetlane, dopóki w adminie nie zapisano własnych historii.
export const defaultPhotoStories: PhotoStory[] = [
  {
    id: "story-1",
    src: "/photos/riders/story-1.jpg",
    title: "Start bez pośpiechu",
    text: "Poranek z lekkim podjazdem, spokojnym tempem i pierwszym postojem po około 40 minutach.",
    tag: "Warm-up ride",
    body:
      "Pierwsze kilometry robimy spokojnie, żeby dzieci złapały rytm bez presji tempa.\n\nPo około 35-45 minutach robimy krótki postój na wodę i przekąskę. To zwykle wystarcza, żeby druga część odcinka poszła płynniej i bez marudzenia.\n\nNa lekkich podjazdach trzymamy równy, spokojny rytm i częściej chwalimy regularność niż prędkość.",
    photos: [
      { src: "/photos/riders/hero-1.jpg" },
      { src: "/photos/riders/hero-3.jpeg" },
      { src: "/photos/riders/hero-2.jpg" },
    ],
  },
  {
    id: "story-2",
    src: "/photos/riders/story-2.jpg",
    title: "Przerwa, która resetuje dzień",
    text: "Krótki odpoczynek przy lesie, uzupełnienie wody i dalej jedziemy bez presji kilometrów.",
    tag: "Forest stop",
    body:
      "Najlepsza przerwa to niekoniecznie najdłuższa, tylko zaplanowana w dobrym momencie.\n\nU nas działa schemat: kilka minut na picie, coś małego do jedzenia i chwila ruchu poza rowerem. Dzięki temu dzieci wracają na trasę z nową energią.\n\nPo postoju startujemy łagodnie i dajemy 5-10 minut na ponowne wejście w tempo.",
    photos: [{ src: "/photos/riders/hero-2.jpg" }, { src: "/photos/riders/hero-3.jpeg" }],
  },
  {
    id: "story-3",
    src: "/photos/riders/story-3.jpg",
    title: "Meta z miejscem na piknik",
    text: "Końcówka trasy z widokiem, gdzie dzieci mają przestrzeń, a dorośli chwilę oddechu.",
    tag: "Finish mood",
    body:
      "Ostatni odcinek planujemy tak, żeby meta była nagrodą, a nie tylko końcem jazdy.\n\nSzukamy miejsca, gdzie można spokojnie usiąść, zjeść i pobyć chwilę razem bez pośpiechu. To pomaga domknąć wyjazd w dobrym nastroju i buduje chęć na kolejną trasę.\n\nPrzed powrotem robimy krótki przegląd: co było najfajniejsze i co poprawić następnym razem.",
    photos: [{ src: "/photos/riders/hero-1.jpg" }, { src: "/photos/riders/hero-3.jpeg" }],
  },
];
