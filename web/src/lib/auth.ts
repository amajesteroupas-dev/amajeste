import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";
import {
  consumeImpersonationJti,
  verifyImpersonationToken,
} from "./impersonation";

class WrongPasswordError extends CredentialsSignin {
  code = "wrong_password";
}

class NoAccountError extends CredentialsSignin {
  code = "no_account";
}

class NotCustomerError extends CredentialsSignin {
  code = "not_customer";
}

class ImpersonationError extends CredentialsSignin {
  code = "impersonation_invalid";
}

/**
 * Auth da loja (cliente). Cookie separado do painel admin.
 * Só aceita usuários com role CUSTOMER.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
        impersonationToken: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const impersonationToken = String(
          credentials?.impersonationToken || ""
        ).trim();

        if (impersonationToken) {
          const verified = await verifyImpersonationToken(impersonationToken);
          if (!verified || !consumeImpersonationJti(verified.jti)) {
            throw new ImpersonationError();
          }
          const user = await prisma.user.findUnique({
            where: { id: verified.userId },
          });
          if (!user || user.role !== "CUSTOMER") {
            throw new NotCustomerError();
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            impersonatedBy: verified.adminId,
          };
        }

        const email = String(credentials?.email || "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new NoAccountError();
        if (user.role !== "CUSTOMER") throw new NotCustomerError();

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) throw new WrongPasswordError();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
