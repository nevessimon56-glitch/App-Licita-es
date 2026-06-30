import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  createSessionToken,
  isAuthEnabled,
} from "@/lib/site-auth";

function verifyPassword(input: string, expected: string): boolean {
  const provided = Buffer.from(input);
  const target = Buffer.from(expected);
  if (provided.length !== target.length) return false;
  return timingSafeEqual(provided, target);
}

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ ok: true });
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: string };
    password = body.password?.trim() ?? "";
  } catch {
    return NextResponse.json(
      { error: "Senha inválida." },
      { status: 400 }
    );
  }

  const expected = process.env.SITE_PASSWORD?.trim() ?? "";
  if (!password || !verifyPassword(password, expected)) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const token = await createSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: "Configuração de autenticação inválida." },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
