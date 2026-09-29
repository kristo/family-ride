export type RouteVerificationLevel = "verified" | "community" | "draft";

export type RouteGpxQuality = "full-track" | "outline" | "none";

export type RouteVerification = {
  level: RouteVerificationLevel;
  gpxQuality: RouteGpxQuality;
  updatedAt: string;
  note: string;
};

export type RouteSurfaceEstimate = {
  asphaltPct: number;
  gravelPct: number;
  unknownPct: number;
  confidence: "low" | "medium" | "high";
  samplesMatched: number;
  samplesTotal: number;
  note: string;
};

export type Route = {
  id: string;
  createdAt?: string;
  name: string;
  region: string;
  distanceKm: number;
  elevationM: number;
  minAge: number;
  asphaltPct: number;
  gravelPct: number;
  /** Ocena edytorska (ręczna). Wyświetlana, dopóki trasa nie ma zatwierdzonych recenzji gości. */
  rating: number;
  description: string;
  hardestPart: string;
  parking: string;
  food: string;
  sleep: string;
  attractions: string[];
  familyNote: string;
  gpxUrl: string;
  mapEmbedUrl: string;
  videoUrl?: string;
  stravaUrl?: string;
  bestMonths: string[];
  packingList: string[];
  verification: RouteVerification;
  surfaceEstimate?: RouteSurfaceEstimate;
  gallery: {
    src: string;
    alt: string;
    caption: string;
  }[];
  /**
   * Liczona w locie z zatwierdzonych recenzji, nigdy nie zapisywana. Gdy > 0, `rating`
   * powyżej jest już podmieniony na średnią z recenzji (patrz app/page.tsx i
   * app/routes/[id]/page.tsx).
   */
  reviewCount?: number;
};

export type RouteSubmissionStatus = "pending" | "approved" | "rejected";

export type RouteDraft = {
  name: string;
  region: string;
  distanceKm: number;
  elevationM: number;
  minAge: number;
  asphaltPct: number;
  rating: number;
  description: string;
  hardestPart: string;
  parking: string;
  food: string;
  sleep: string;
  attractions: string[];
  familyNote: string;
  gpxUrl: string;
  mapEmbedUrl: string;
  videoUrl?: string;
  stravaUrl?: string;
  bestMonths: string[];
  packingList: string[];
  surfaceEstimate?: RouteSurfaceEstimate;
  gallery: {
    src: string;
    alt: string;
    caption: string;
  }[];
};

export type RouteSubmission = {
  id: string;
  status: RouteSubmissionStatus;
  createdAt: string;
  updatedAt: string;
  submitterName: string;
  submitterEmail?: string;
  adminNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  publishedRouteId?: string;
  draft: RouteDraft;
};

export type PhotoStoryPhoto = {
  src: string;
  caption?: string;
};

export type PhotoStory = {
  id: string;
  /** Zdjęcie okładkowe (karta na stronie głównej i początek galerii). */
  src: string;
  title: string;
  /** Krótki opis na karcie (automatycznie wyliczany z body, gdy pusty). */
  text: string;
  tag: string;
  /** Główna treść artykułu, akapity oddzielone pustą linią. */
  body?: string;
  /** Dodatkowe zdjęcia galerii artykułu (poza okładką). */
  photos?: PhotoStoryPhoto[];
  /** Ukryta ze strony głównej i /stories, ale zostaje w bazie (nie usunięta). */
  hidden?: boolean;
};

export type RouteReviewStatus = "pending" | "approved" | "rejected";

export type RouteReview = {
  id: string;
  routeId: string;
  /** Zdenormalizowane, żeby lista w adminie nie musiała dociągać trasy po id. */
  routeName: string;
  status: RouteReviewStatus;
  /** Liczba całkowita 1-5. */
  rating: number;
  comment?: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type RouteReviewSummary = {
  /** Zaokrąglona do 1 miejsca po przecinku. */
  average: number;
  count: number;
};
