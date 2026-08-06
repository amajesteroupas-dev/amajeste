"use client";

import { SessionProvider } from "next-auth/react";
import { FavoritesProvider } from "@/components/store/FavoritesProvider";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FavoritesProvider>{children}</FavoritesProvider>
    </SessionProvider>
  );
}
