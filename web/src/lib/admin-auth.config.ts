import type { NextAuthConfig } from "next-auth";
import {
  adminSessionCookieName,
  jwtSessionCallbacks,
  sessionCookieOptions,
} from "@/lib/auth-cookies";

/**
 * Edge-compatible auth do PAINEL ADMIN.
 * Sessão separada da conta de cliente na loja.
 */
export const adminAuthConfig = {
  trustHost: true,
  providers: [],
  basePath: "/api/admin/auth",
  pages: {
    signIn: "/admin/login",
  },
  session: { strategy: "jwt" },
  cookies: sessionCookieOptions(adminSessionCookieName),
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const role = (auth?.user as { role?: string } | undefined)?.role;
      const isStaff = role === "ADMIN" || role === "STAFF";

      if (pathname.startsWith("/admin/login")) {
        if (auth?.user && isStaff) {
          return Response.redirect(new URL("/admin", request.nextUrl));
        }
        return true;
      }

      if (pathname.startsWith("/api/admin/auth")) {
        return true;
      }

      if (pathname.startsWith("/api/admin")) {
        return Boolean(auth?.user && isStaff);
      }

      if (pathname.startsWith("/admin")) {
        if (!auth?.user || !isStaff) {
          return Response.redirect(new URL("/admin/login", request.nextUrl));
        }
        return true;
      }

      return true;
    },
    ...jwtSessionCallbacks,
  },
} satisfies NextAuthConfig;
