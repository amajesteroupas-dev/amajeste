import type { NextAuthConfig } from "next-auth";
import {
  jwtSessionCallbacks,
  sessionCookieOptions,
  storeSessionCookieName,
} from "@/lib/auth-cookies";

/**
 * Edge-compatible auth da LOJA (cliente).
 * Sessão separada do painel admin.
 */
export const authConfig = {
  trustHost: true,
  providers: [],
  pages: {
    signIn: "/entrar",
  },
  session: { strategy: "jwt" },
  cookies: sessionCookieOptions(storeSessionCookieName),
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const role = (auth?.user as { role?: string } | undefined)?.role;
      const isCustomer = role === "CUSTOMER";

      if (pathname === "/entrar" || pathname === "/cadastro") {
        if (auth?.user && isCustomer) {
          return Response.redirect(new URL("/", request.nextUrl));
        }
        // Admin logado no painel NÃO bloqueia login de cliente
        return true;
      }

      if (
        pathname.startsWith("/conta") ||
        pathname.startsWith("/academia")
      ) {
        if (!auth?.user || !isCustomer) {
          return Response.redirect(new URL("/entrar", request.nextUrl));
        }
        return true;
      }

      return true;
    },
    ...jwtSessionCallbacks,
  },
} satisfies NextAuthConfig;
