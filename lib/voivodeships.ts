/**
 * 16 polskich województw, w formie używanej też jako wartość pola `region` tras.
 * Stała lista (zamiast dowolnego tekstu) chroni przed literówkami i rozjazdami typu
 * "Małopolska" / "małopolska", które psuły filtr regionu na stronie głównej (dwa różne
 * zapisy tego samego regionu liczyły się jako osobne pozycje w selekcie).
 */
export const VOIVODESHIPS = [
  "Dolnośląskie",
  "Kujawsko-Pomorskie",
  "Lubelskie",
  "Lubuskie",
  "Łódzkie",
  "Małopolskie",
  "Mazowieckie",
  "Opolskie",
  "Podkarpackie",
  "Podlaskie",
  "Pomorskie",
  "Śląskie",
  "Świętokrzyskie",
  "Warmińsko-Mazurskie",
  "Wielkopolskie",
  "Zachodniopomorskie",
] as const;

export type Voivodeship = (typeof VOIVODESHIPS)[number];
