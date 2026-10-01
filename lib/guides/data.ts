import type { Guide } from "@/lib/guides/types";

// ============================================================================
// JAK DODAĆ POLECANY PRODUKT (LINK AFILIACYJNY)
// W wybranym poradniku wpisz obiekt do tablicy `products`, np.:
//   {
//     name: "Nazwa modelu",
//     summary: "Dla kogo i dlaczego go polecasz - jedno zdanie.",
//     pros: ["zaleta 1", "zaleta 2"],
//     priceNote: "ok. 300-400 zł",
//     affiliateUrl: "https://... (link wygenerowany w sieci afiliacyjnej)",
//     merchant: "Decathlon",
//   }
// Produkty bez linku https nie są wyświetlane. Polecaj tylko sprzęt, który znasz
// albo który realnie sprawdziłeś - to buduje zaufanie i pozycję strony.
// ============================================================================

export const guides: Guide[] = [
  {
    slug: "jak-wybrac-fotelik-rowerowy-dla-dziecka",
    title: "Jak wybrać fotelik rowerowy dla dziecka: przód czy tył, na co zwrócić uwagę",
    cardTitle: "Jak wybrać fotelik rowerowy dla dziecka",
    description:
      "Fotelik z przodu czy z tyłu roweru, jaki udźwig, jak go zamontować i na co uważać. Praktyczny poradnik dla rodziców, którzy ruszają na pierwsze trasy.",
    category: "Foteliki i przyczepki",
    publishedAt: "2026-10-01",
    updatedAt: "2026-10-01",
    intro:
      "Fotelik rowerowy to pierwszy sprzęt, który kupuje większość rodzin planujących wspólne wyprawy z małym dzieckiem. Zły wybór kończy się niewygodą, marudzeniem albo fotelikiem, który nie pasuje do roweru. Poniżej zebraliśmy rzeczy, które naprawdę mają znaczenie.",
    sections: [
      {
        heading: "Fotelik przedni czy tylny?",
        paragraphs: [
          "Fotelik przedni mocuje się przed kierowcą, zwykle do ramy lub kierownicy. Dziecko siedzi blisko, widzi drogę i można z nim łatwo rozmawiać. Foteliki przednie są jednak przeznaczone dla młodszych i lżejszych dzieci, a przy dłuższej jeździe dziecko szybko z nich wyrasta.",
          "Fotelik tylny montuje się na bagażniku albo do ramy za siodełkiem. Mieści starsze i cięższe dzieci, daje stabilniejszą jazdę z większym obciążeniem i zwykle wytrzymuje dłużej, bo dziecko rośnie, a fotelik nadal pasuje.",
        ],
        bullets: [
          "Dziecko około roku, krótkie trasy po mieście: fotelik przedni może być wygodny.",
          "Planujesz dłuższe wyprawy i chcesz, żeby fotelik służył kilka lat: wybierz tylny.",
          "Rower ma amortyzowany widelec, rurę ramy nietypowego kształtu albo bagażnik z ograniczeniem nośności: najpierw sprawdź kompatybilność.",
        ],
      },
      {
        heading: "Od kiedy i do ilu kilogramów?",
        paragraphs: [
          "Dziecko powinno samodzielnie siedzieć i utrzymywać głowę w kasku, co zwykle następuje około 9-12 miesiąca życia. Zawsze kieruj się jednak wiekiem i masą podanymi przez producenta konkretnego modelu.",
          "Typowy limit dla fotelików tylnych to około 22 kg razem z fotelikiem na bagażniku, ale wartości różnią się między modelami. Nie przekraczaj też dopuszczalnej nośności bagażnika i roweru.",
          "W Polsce przewożenie dzieci do 7. roku życia w foteliku wymaga, żeby osoba kierująca rowerem miała ukończone 18 lat. Przepisy mogą się zmieniać, więc przed zakupem sprawdź aktualne regulacje.",
        ],
      },
      {
        heading: "Na co patrzeć przy zakupie",
        paragraphs: ["Przy porównywaniu modeli warto kierować się tymi kryteriami:"],
        bullets: [
          "Norma bezpieczeństwa: szukaj informacji o zgodności z normą EN 14344 dla fotelików rowerowych dla dzieci.",
          "Pasy i zapięcia: pięciopunktowe pasy dobrze trzymają dziecko, a klamra powinna być łatwa dla dorosłego i trudna dla malucha.",
          "Osłony na stopy: chronią nogi przed wpadnięciem w szprychy. Regulowane paski na stopy to standard w dobrych modelach.",
          "Regulacja: fotelik z regulowanym oparciem i podnóżkami wytrzyma więcej miesięcy.",
          "Mocowanie: sprawdź, czy pasuje do Twojej ramy (średnica rury, kształt) albo bagażnika. To najczęstszy powód zwrotów.",
          "Waga i stabilność: ciężki fotelik z ciężkim dzieckiem mocno zmienia prowadzenie roweru, dlatego pierwsze przejazdy zrób z pustym fotelikiem.",
        ],
      },
      {
        heading: "Zanim wyruszysz",
        paragraphs: [
          "Dziecko zawsze powinno mieć kask dopasowany do obwodu głowy. Przed pierwszą wyprawą zrób próbną jazdę po płaskim terenie, ćwicz ruszanie, zatrzymywanie i skręty, bo środek ciężkości roweru z pasażerem zachowuje się inaczej.",
          "Na trasy rodzinne wybieraj odcinki o niskim natężeniu ruchu i dobrej nawierzchni. U nas przy każdej trasie znajdziesz podany procent asfaltu i trudny fragment, więc od razu widać, czy nadaje się dla fotelika.",
        ],
      },
    ],
    faq: [
      {
        question: "Od kiedy dziecko może jechać w foteliku rowerowym?",
        answer:
          "Gdy samodzielnie siedzi i utrzymuje głowę w kasku, zwykle około 9-12 miesiąca życia. Zawsze sprawdź wiek i wagę dopuszczone przez producenta modelu.",
      },
      {
        question: "Fotelik z przodu czy z tyłu roweru?",
        answer:
          "Przedni jest dla młodszych, lżejszych dzieci i krótkich tras. Tylny mieści starsze i cięższe dzieci oraz służy dłużej, dlatego wybierają go rodziny planujące dłuższe wyprawy.",
      },
      {
        question: "Czy dziecko musi mieć kask w foteliku rowerowym?",
        answer:
          "W Polsce kask nie jest obowiązkowy, ale zdecydowanie zalecany. Dla dziecka w foteliku powinien być dopasowany do obwodu głowy i zapięty.",
      },
    ],
    products: [],
    productsHeading: "Polecane foteliki rowerowe",
  },
  {
    slug: "przyczepka-rowerowa-czy-fotelik",
    title: "Przyczepka rowerowa czy fotelik? Co wybrać na rodzinne wyprawy",
    cardTitle: "Przyczepka rowerowa czy fotelik?",
    description:
      "Przyczepka czy fotelik rowerowy dla dziecka: porównanie wygody, bezpieczeństwa, ceny i miejsca. Sprawdź, co sprawdzi się na Twoich trasach.",
    category: "Foteliki i przyczepki",
    publishedAt: "2026-10-01",
    updatedAt: "2026-10-01",
    intro:
      "Obie opcje pozwalają zabrać dziecko na rower, ale sprawdzają się w innych sytuacjach. Wybór zależy od wieku dziecka, długości tras, liczby pasażerów i miejsca, jakie masz w domu i samochodzie.",
    sections: [
      {
        heading: "Fotelik: lekki i zwinny",
        paragraphs: [
          "Fotelik jest tańszy, lżejszy i zajmuje mało miejsca. Rower z fotelikiem prowadzi się naturalnie, więc nadaje się też na ścieżki z ciaśniejszymi zakrętami. Ograniczeniem jest jedno dziecko, wiek i waga.",
        ],
        bullets: [
          "Zaleta: niższa cena, lekkość, łatwość parkowania i transportu.",
          "Wada: dziecko jest bardziej odsłonięte na wiatr, deszcz i zimno.",
          "Wada: ograniczony czas użytkowania, zwykle do około 22 kg.",
        ],
      },
      {
        heading: "Przyczepka: komfort i miejsce",
        paragraphs: [
          "Przyczepka daje dziecku osłonę przed pogodą, a często także miejsce na bagaż. Mieści zwykle dwoje dzieci i pozwala im spać w trakcie jazdy. W wielu modelach można ją zamienić w wózek, co przydaje się na postojach.",
        ],
        bullets: [
          "Zaleta: ochrona przed deszczem, wiatrem i słońcem, miejsce na bagaż.",
          "Zaleta: stabilność na długich trasach i większy limit wagi.",
          "Wada: wyższa cena, większe gabaryty i trudniejszy transport.",
          "Wada: gorsza widoczność przyczepki w ruchu, dlatego potrzebna jest flaga i światła.",
        ],
      },
      {
        heading: "Co wybrać do jakich tras?",
        paragraphs: [
          "Krótkie wypady po okolicy z jednym dzieckiem: fotelik w zupełności wystarczy. Wielodniowe wyprawy, dwoje dzieci albo zmienna pogoda: przyczepka daje więcej komfortu.",
          "Na szlakach z szutrem i nierównościami zwróć uwagę na amortyzację. W naszych opisach tras pokazujemy procent nawierzchni, który pomaga ocenić, jak będzie trzęsło.",
        ],
      },
    ],
    faq: [
      {
        question: "Czy przyczepka rowerowa jest bezpieczniejsza niż fotelik?",
        answer:
          "Daje lepszą ochronę przed pogodą i stabilniejszą jazdę, ale wymaga widocznej flagi i świateł oraz większej uwagi na zakrętach i wąskich przejściach. Bezpieczeństwo zależy od jakości modelu i sposobu jazdy.",
      },
      {
        question: "Czy przyczepką da się przewozić dwoje dzieci?",
        answer:
          "Tak, wiele przyczepek jest dwumiejscowych. Sprawdź łączny limit wagi podany przez producenta.",
      },
    ],
    products: [],
    productsHeading: "Polecane przyczepki i foteliki",
  },
  {
    slug: "kask-rowerowy-dla-dziecka-jak-dobrac",
    title: "Kask rowerowy dla dziecka: jak dobrać rozmiar i na co uważać",
    cardTitle: "Kask rowerowy dla dziecka: jak dobrać",
    description:
      "Jak zmierzyć głowę dziecka, dopasować kask i sprawdzić, czy dobrze leży. Prosty poradnik dla rodziców przed pierwszą wyprawą rowerową.",
    category: "Bezpieczeństwo",
    publishedAt: "2026-10-01",
    updatedAt: "2026-10-01",
    intro:
      "Kask to najważniejszy element wyposażenia dziecka na rowerze. Działa tylko wtedy, gdy jest dobrze dopasowany, dlatego rozmiar i sposób zapięcia mają większe znaczenie niż cena czy kolor.",
    sections: [
      {
        heading: "Jak zmierzyć głowę",
        paragraphs: [
          "Zmierz obwód głowy miękką miarką krawiecką, prowadząc ją około centymetra nad brwiami i uszami, w najszerszym miejscu. Porównaj wynik z tabelą rozmiarów producenta, bo oznaczenia (S, M, XS) różnią się między markami.",
          "Dzieci szybko rosną, ale nie kupuj kasku „na wyrost”. Zbyt duży kask zsuwa się i nie chroni, nawet jeśli pasy są zapięte.",
        ],
      },
      {
        heading: "Jak sprawdzić, czy kask leży dobrze",
        paragraphs: ["Przed każdą wyprawą przejdź prostą kontrolę:"],
        bullets: [
          "Kask leży poziomo, około dwóch palców nad brwiami, nie odchyla się do tyłu.",
          "Paski tworzą literę V pod uszami, a pod brodą mieszczą się maksymalnie dwa palce.",
          "Po poruszeniu głową kask nie przesuwa się na boki ani do przodu.",
          "Pokrętło z tyłu jest dokręcone tak, żeby kask trzymał się bez ucisku.",
        ],
      },
      {
        heading: "Na co zwracać uwagę przy zakupie",
        paragraphs: [
          "Szukaj kasku z certyfikatem zgodności z normą EN 1078. Przydają się: regulacja obwodu, dobra wentylacja, lekka konstrukcja i odblaski albo światełko z tyłu. Po upadku, w którym kask uderzył o ziemię, wymień go, nawet jeśli nie widać uszkodzeń.",
        ],
      },
    ],
    faq: [
      {
        question: "Czy kask rowerowy dla dziecka jest obowiązkowy w Polsce?",
        answer:
          "Nie ma ogólnego obowiązku, ale kask jest zdecydowanie zalecany, szczególnie dla dzieci. Sprawdź aktualne przepisy, bo mogą się zmieniać.",
      },
      {
        question: "Jak często trzeba wymieniać kask dziecięcy?",
        answer:
          "Gdy dziecko z niego wyrośnie, po upadku z uderzeniem w głowę albo gdy pojawią się widoczne uszkodzenia. Producenci zwykle zalecają też wymianę po kilku latach użytkowania.",
      },
    ],
    products: [],
    productsHeading: "Polecane kaski dziecięce",
  },
  {
    slug: "jaki-rower-dla-dziecka-wiek-i-rozmiar-kol",
    title: "Jaki rower dla dziecka? Dobór rozmiaru kół według wzrostu i wieku",
    cardTitle: "Jaki rower dla dziecka: rozmiar kół i wiek",
    description:
      "Jak dobrać rower do dziecka: rozmiar kół według wzrostu, rowerek biegowy, hamulce, przerzutki i waga. Zasady, które pomagają uniknąć kupienia roweru „na wyrost”.",
    category: "Sprzęt",
    publishedAt: "2026-10-01",
    updatedAt: "2026-10-01",
    intro:
      "Przy rowerach dziecięcych wiek jest tylko orientacją. O wyborze decyduje wzrost, a dokładniej długość nogi, bo od niej zależy, czy dziecko sięgnie do ziemi i wygodnie pedałuje. Poniżej znajdziesz proste zasady doboru i orientacyjną tabelę rozmiarów.",
    sections: [
      {
        heading: "Rozmiar kół według wzrostu",
        paragraphs: [
          "Rozmiar roweru dziecięcego określa średnica kół w calach. Wartości poniżej są orientacyjne i różnią się między producentami, dlatego zawsze sprawdź tabelę rozmiarów konkretnego modelu.",
        ],
        bullets: [
          "Rowerek biegowy (koła 10-12\"): od około 18 miesięcy do 4 lat, dziecko uczy się równowagi bez pedałów.",
          "12-14\": około 2-5 lat, wzrost mniej więcej 85-105 cm.",
          "16\": około 4-6 lat, wzrost mniej więcej 100-115 cm.",
          "20\": około 6-9 lat, wzrost mniej więcej 115-130 cm. To pierwszy rozmiar sensowny na dłuższe rodzinne trasy.",
          "24\": około 8-12 lat, wzrost mniej więcej 130-145 cm.",
          "26\" i większe: od około 145 cm wzrostu, wtedy dobiera się rower według ramy jak dla dorosłych.",
        ],
      },
      {
        heading: "Jak sprawdzić, czy rower pasuje",
        paragraphs: ["Przed zakupem posadź dziecko na rowerze i przejdź prostą kontrolę:"],
        bullets: [
          "Dziecko siedzące na siodełku sięga stopami do ziemi przynajmniej palcami, a przy staniu nad ramą ma kilka centymetrów luzu.",
          "Po ustawieniu siodełka noga przy dolnym położeniu pedału jest prawie wyprostowana, ale nie na sztywno.",
          "Ręce sięgają do kierownicy bez nadmiernego wychylania, a dźwignie hamulców dziecko obsługuje małą dłonią.",
          "Rower nie jest za ciężki. Orientacyjnie dobrze, gdy waży nie więcej niż około jedną trzecią masy dziecka.",
        ],
      },
      {
        heading: "Nie kupuj roweru „na wyrost”",
        paragraphs: [
          "Zbyt duży rower jest niewygodny i niebezpieczny: dziecko nie sięga do ziemi, trudno mu ruszyć, zatrzymać się i panować nad kierownicą. Lepiej kupić rower pasujący teraz, a po sezonie odsprzedać go i wziąć większy. Dobrze utrzymane rowery dziecięce łatwo sprzedać z niewielką stratą.",
        ],
      },
      {
        heading: "Hamulce i przerzutki",
        paragraphs: [
          "Młodsze dzieci (rozmiary 12-16\") często mają hamulec w pedale (torpedo) i ręczny. Ważne, żeby dziecko dosięgało dźwigni i miało dość siły, by zatrzymać rower. Przerzutki pojawiają się zwykle od 20\" i na dłuższych trasach z podjazdami są bardzo przydatne.",
          "Na rodzinne trasy z lekkim podjazdem wybierz rower z kilkoma przełożeniami i dobrymi hamulcami. W naszych opisach tras znajdziesz przewyższenie i trudny fragment, które pomagają ocenić potrzebny sprzęt.",
        ],
      },
      {
        heading: "Co jeszcze warto sprawdzić",
        paragraphs: [
          "Kask dopasowany do dziecka, dzwonek, światła (przód i tył) i odblaski to minimum, szczególnie na trasach, gdzie ścieżka przecina drogi. Przed pierwszą wyprawą zrób próbną jazdę po płaskim terenie.",
        ],
      },
    ],
    faq: [
      {
        question: "Od kiedy dziecko może jeździć na rowerze?",
        answer:
          "Na rowerku biegowym zwykle od około 18 miesięcy do 2 lat. Na rowerze z pedałami najczęściej od 4-5 lat, gdy złapie równowagę i potrafi samodzielnie hamować.",
      },
      {
        question: "Jaki rozmiar koła dla 6-latka?",
        answer:
          "Zwykle 16\" albo 20\", zależnie od wzrostu. Jeśli dziecko ma około 115 cm lub więcej, częściej pasuje 20\". Najpewniej sprawdzić to przez przymiarkę.",
      },
      {
        question: "Czy warto kupić rower używany dla dziecka?",
        answer:
          "Tak, jeśli jest sprawny: hamulce, łańcuch i opony w dobrym stanie. Dzieci szybko z rowerów wyrastają, więc rynek wtórny jest duży i opłacalny.",
      },
    ],
    products: [],
    productsHeading: "Polecane rowery dziecięce",
  },
];
