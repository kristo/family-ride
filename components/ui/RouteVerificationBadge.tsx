import { verificationLabel, verificationTone } from "@/lib/route-verification";
import type { RouteVerificationLevel } from "@/lib/types";

type RouteVerificationBadgeProps = {
  level: RouteVerificationLevel;
  className?: string;
};

export function RouteVerificationBadge({ level, className = "" }: RouteVerificationBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-[0.02em] ${verificationTone(level)} ${className}`}
      aria-label={`Status trasy: ${verificationLabel(level)}`}
    >
      {verificationLabel(level)}
    </span>
  );
}
