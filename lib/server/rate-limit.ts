// Prosty limiter w pamięci procesu. Na Vercelu każda instancja ma własny licznik, więc to
// ochrona "best effort" przed przypadkowym floodem - nie zastępuje WAF-a (Vercel Firewall).
const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) {
          buckets.delete(k);
        }
      }
    }
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}
