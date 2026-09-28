import type { PhotoStory } from "@/lib/types";

// Wyświetlane, dopóki w adminie nie zapisano własnych historii.
export const defaultPhotoStories: PhotoStory[] = [
  {
    id: "story-1",
    src: "/photos/riders/story-1.jpg",
    title: "Start bez pośpiechu",
    text: "Poranek z lekkim podjazdem, spokojnym tempem i pierwszym postojem po około 40 minutach.",
    tag: "Warm-up ride",
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
    photos: [{ src: "/photos/riders/hero-2.jpg" }, { src: "/photos/riders/hero-3.jpeg" }],
  },
  {
    id: "story-3",
    src: "/photos/riders/story-3.jpg",
    title: "Meta z miejscem na piknik",
    text: "Końcówka trasy z widokiem, gdzie dzieci mają przestrzeń, a dorośli chwilę oddechu.",
    tag: "Finish mood",
    photos: [{ src: "/photos/riders/hero-1.jpg" }, { src: "/photos/riders/hero-3.jpeg" }],
  },
];
