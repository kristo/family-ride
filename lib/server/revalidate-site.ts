import { revalidatePath } from "next/cache";

// Strona główna, strony tras/historii i sitemap są cache'owane - po zmianie w panelu admina
// trzeba je odświeżyć, inaczej zmiana pojawi się publicznie dopiero po wygaśnięciu cache.
export function revalidatePublicPages(options: { routeId?: string } = {}): void {
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  if (options.routeId) {
    revalidatePath(`/routes/${options.routeId}`);
  } else {
    revalidatePath("/routes/[id]", "page");
  }
  revalidatePath("/stories/[id]", "page");
}
