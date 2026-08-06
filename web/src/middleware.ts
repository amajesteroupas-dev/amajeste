import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { adminAuthConfig } from "@/lib/admin-auth.config";

const { auth: storeAuth } = NextAuth(authConfig);
const { auth: adminAuthMw } = NextAuth(adminAuthConfig);

/**
 * Rotas de upload/vídeo NÃO entram no matcher do middleware.
 * No Next 15, só passar pelo middleware aplica limite ~10MB no body
 * (mesmo com NextResponse.next() e experimental.*MaxBodySize).
 * A auth fica na própria route handler.
 */
export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path.startsWith("/api/admin/auth")) {
    return NextResponse.next();
  }

  if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (adminAuthMw as any)(req);
  }

  if (
    path.startsWith("/conta") ||
    path.startsWith("/academia") ||
    path === "/entrar" ||
    path === "/cadastro"
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (storeAuth as any)(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    /*
     * Admin API com auth no middleware, EXCETO uploads de mídia/vídeo
     * (body grande — auth só na route).
     */
    "/api/admin/((?!auth(?:/|$)|video-bank(?:/|$)|video-cutout-bank(?:/|$)|media(?:/|$)|videos(?:/|$)|products/[^/]+/video(?:/|$)).*)",
    "/conta/:path*",
    "/academia/:path*",
    "/entrar",
    "/cadastro",
  ],
};
