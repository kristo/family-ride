export type GuideProduct = {
  name: string;
  /** Jedno zdanie: dla kogo i dlaczego polecamy. */
  summary: string;
  pros?: string[];
  /** Orientacyjna cena, np. "ok. 300-400 zł" - bez dokładnych kwot, bo szybko się dezaktualizują. */
  priceNote?: string;
  /** Link afiliacyjny z sieci (Awin, Convertiser...). Produkt bez linku nie jest pokazywany. */
  affiliateUrl: string;
  /** Nazwa sklepu na przycisku, np. "Decathlon". */
  merchant: string;
  /** Opcjonalne zdjęcie z /public (np. /guides/fotelik-1.jpg). */
  image?: string;
};

export type GuideSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type Guide = {
  slug: string;
  title: string;
  /** Krótszy tytuł na kafelek na liście poradników. */
  cardTitle: string;
  /** Meta description i opis na kafelku (do ok. 155 znaków). */
  description: string;
  category: "Foteliki i przyczepki" | "Sprzęt" | "Bezpieczeństwo";
  publishedAt: string;
  updatedAt: string;
  intro: string;
  sections: GuideSection[];
  faq: { question: string; answer: string }[];
  /** Sekcja "Polecane" - pusta, dopóki nie dodasz linków afiliacyjnych. */
  products: GuideProduct[];
  productsHeading?: string;
};
