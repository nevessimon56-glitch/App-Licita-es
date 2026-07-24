import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseEnabled,
} from "@/lib/supabase/config";
import {
  ADMIN_COOKIE_NAME,
  isAdminAuthEnabled,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";
import {
  AUTH_COOKIE_NAME,
  isAuthEnabled,
  verifySessionToken,
} from "@/lib/site-auth";

const PUBLIC_PATHS = new Set([
  "/login",
  "/admin/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/admin/login",
  "/api/admin/logout",
  "/api/health",
]);

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/admin/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAdminPath(pathname) || isAdminApiPath(pathname)) {
    if (PUBLIC_PATHS.has(pathname)) {
      return NextResponse.next();
    }

    if (!isAdminAuthEnabled()) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Painel admin não configurado." },
          { status: 503 }
        );
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const isAdmin = await verifyAdminSessionToken(adminToken);

    if (!isAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
      }
      const loginUrl = new URL("/admin/login", request.url);
      if (pathname !== "/admin") {
        loginUrl.searchParams.set("from", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (isSupabaseEnabled()) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (PUBLIC_PATHS.has(pathname)) {
      if (pathname === "/login" && user) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return response;
    }

    if (!user) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
      }

      const loginUrl = new URL("/login", request.url);
      if (pathname !== "/") {
        loginUrl.searchParams.set("from", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  if (!isAuthEnabled()) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") {
    loginUrl.searchParams.set("from", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
