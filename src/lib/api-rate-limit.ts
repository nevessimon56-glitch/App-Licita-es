import { NextResponse } from "next/server";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";

export function rateLimitResponse(result: {
  ok: boolean;
  retryAfterSec?: number;
}): NextResponse | null {
  if (result.ok) return null;

  return NextResponse.json(
    {
      error: `Muitas requisições. Tente novamente em ${result.retryAfterSec ?? 60} segundos.`,
    },
    {
      status: 429,
      headers: result.retryAfterSec
        ? { "Retry-After": String(result.retryAfterSec) }
        : undefined,
    }
  );
}

export function enforceApiRateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number,
  userId?: string | null
): NextResponse | null {
  const key = getClientKey(request, userId, bucket);
  const result = checkRateLimit(key, limit, windowMs);
  return rateLimitResponse(result);
}
