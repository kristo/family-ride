export type PhotoCredit = {
  sourceName: string;
  filePageUrl: string;
};

export const photoCredits: Record<string, PhotoCredit> = {
  "/photos/family-bike-1.jpg": {
    sourceName: "Cycling family, with dog - geograph.org.uk - 5241065.jpg",
    filePageUrl:
      "https://commons.wikimedia.org/wiki/File:Cycling%20family%2C%20with%20dog%20-%20geograph.org.uk%20-%205241065.jpg",
  },
  "/photos/family-bike-2.jpg": {
    sourceName: "Family cycling in the Forest of Dean - geograph.org.uk - 1591472.jpg",
    filePageUrl:
      "https://commons.wikimedia.org/wiki/File:Family%20cycling%20in%20the%20Forest%20of%20Dean%20-%20geograph.org.uk%20-%201591472.jpg",
  },
  "/photos/family-bike-3.jpg": {
    sourceName: "Lichfield Road, a cycling family - geograph.org.uk - 6432311.jpg",
    filePageUrl:
      "https://commons.wikimedia.org/wiki/File:Lichfield%20Road%2C%20a%20cycling%20family%20-%20geograph.org.uk%20-%206432311.jpg",
  },
};
