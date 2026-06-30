export const AUTH_COOKIE_NAME = "app_licitacoes_session";

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function isAuthEnabled(): boolean {
  return Boolean(process.env.SITE_PASSWORD?.trim());
}

export function getAuthSecret(): string | null {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.SITE_PASSWORD?.trim();
  return secret || null;
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function createSessionToken(): Promise<string | null> {
  const secret = getAuthSecret();
  if (!secret) return null;

  const payload = toBase64Url(
    JSON.stringify({ exp: Date.now() + SESSION_MAX_AGE_MS })
  );
  const signature = await signPayload(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const secret = getAuthSecret();
  if (!secret) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = await signPayload(payload, secret);
  if (!timingSafeEqualString(signature, expected)) return false;

  try {
    const data = JSON.parse(fromBase64Url(payload)) as { exp?: number };
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export const AUTH_COOKIE_MAX_AGE_SECONDS = Math.floor(SESSION_MAX_AGE_MS / 1000);
