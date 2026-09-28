import Image from "next/image";

type PhotoProps = {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
};

function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Zdjęcie wypełniające rodzica (rodzic musi mieć position: relative i rozmiar).
 * Adresy zewnętrzne (np. Vercel Blob z admina) idą przez zwykły <img>, bo
 * next/image wymaga dopisania hosta do konfiguracji.
 */
export function Photo({ src, alt, sizes = "100vw", className = "object-cover", priority = false }: PhotoProps) {
  if (isExternalUrl(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`h-full w-full ${className}`} loading={priority ? "eager" : "lazy"} />;
  }

  return <Image src={src} alt={alt} fill sizes={sizes} className={className} priority={priority} />;
}
