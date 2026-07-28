type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec?: number;
  remaining?: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  return {
    ok: true,
    remaining: Math.max(0, limit - bucket.count),
  };
}

export function getClientKey(
  request: Request,
  userId?: string | null,
  bucket = "default"
): string {
  if (userId) return `${bucket}:user:${userId}`;

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `${bucket}:ip:${ip}`;
}
