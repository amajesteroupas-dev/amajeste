import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      /** Preenchido quando admin entrou como este cliente. */
      impersonatedBy?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    impersonatedBy?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    impersonatedBy?: string;
  }
}
