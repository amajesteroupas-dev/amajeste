const secure = process.env.NODE_ENV === "production";

/** Cookie da sessão da loja (cliente) — independente do admin. */
export const storeSessionCookieName = secure
  ? "__Secure-majeste.store-token"
  : "majeste.store-token";

/** Cookie da sessão do painel admin — independente da loja. */
export const adminSessionCookieName = secure
  ? "__Secure-majeste.admin-token"
  : "majeste.admin-token";

export function sessionCookieOptions(name: string) {
  return {
    sessionToken: {
      name,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure,
      },
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jwtSessionCallbacks: any = {
  async jwt({ token, user }: { token: Record<string, unknown>; user?: { id?: string; role?: string } }) {
    if (user) {
      token.role = user.role;
      token.id = user.id;
    }
    return token;
  },
  async session({
    session,
    token,
  }: {
    session: { user?: Record<string, unknown> };
    token: Record<string, unknown>;
  }) {
    if (session.user) {
      session.user.role = token.role as string;
      session.user.id = token.id as string;
    }
    return session;
  },
};
