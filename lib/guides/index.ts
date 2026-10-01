import { guides } from "@/lib/guides/data";
import type { Guide, GuideProduct } from "@/lib/guides/types";

export function getAllGuides(): Guide[] {
  return [...guides].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}

/** Tylko produkty z prawdziwym linkiem (https) - puste szablony nigdy nie trafiają na stronę. */
export function getLiveProducts(guide: Guide): GuideProduct[] {
  return guide.products.filter((product) => /^https:\/\//i.test(product.affiliateUrl));
}
