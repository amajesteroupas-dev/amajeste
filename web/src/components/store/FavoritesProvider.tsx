"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "next-auth/react";

type FavoritesCtx = {
  ids: Set<string>;
  ready: boolean;
  isFavorite: (productId: string) => boolean;
  toggle: (productId: string) => Promise<"ok" | "login" | "error">;
};

const Ctx = createContext<FavoritesCtx>({
  ids: new Set(),
  ready: false,
  isFavorite: () => false,
  toggle: async () => "login",
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setIds(new Set());
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/favorites");
        if (!res.ok) {
          if (!cancelled) {
            setIds(new Set());
            setReady(true);
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setIds(new Set(Array.isArray(data.ids) ? data.ids : []));
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setIds(new Set());
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  const toggle = useCallback(
    async (productId: string): Promise<"ok" | "login" | "error"> => {
      if (status !== "authenticated") return "login";

      const was = ids.has(productId);
      setIds((prev) => {
        const next = new Set(prev);
        if (was) next.delete(productId);
        else next.add(productId);
        return next;
      });

      try {
        const res = await fetch("/api/favorites", {
          method: was ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (res.status === 401) {
          setIds((prev) => {
            const next = new Set(prev);
            if (was) next.add(productId);
            else next.delete(productId);
            return next;
          });
          return "login";
        }
        if (!res.ok) {
          setIds((prev) => {
            const next = new Set(prev);
            if (was) next.add(productId);
            else next.delete(productId);
            return next;
          });
          return "error";
        }
        return "ok";
      } catch {
        setIds((prev) => {
          const next = new Set(prev);
          if (was) next.add(productId);
          else next.delete(productId);
          return next;
        });
        return "error";
      }
    },
    [ids, status]
  );

  const value = useMemo<FavoritesCtx>(
    () => ({
      ids,
      ready,
      isFavorite: (productId: string) => ids.has(productId),
      toggle,
    }),
    [ids, ready, toggle]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavorites() {
  return useContext(Ctx);
}
