import { photoCredits } from "@/lib/photo-credits";

type PhotoCreditProps = {
  src: string;
  className?: string;
};

export function PhotoCredit({ src, className = "" }: PhotoCreditProps) {
  const credit = photoCredits[src];
  if (!credit) {
    return null;
  }

  return (
    <p className={`mt-2 text-[11px] text-[var(--muted)] ${className}`.trim()}>
      Foto: {" "}
      <a href={credit.filePageUrl} target="_blank" rel="noreferrer" className="underline decoration-dotted">
        Wikimedia Commons - {credit.sourceName}
      </a>
    </p>
  );
}
