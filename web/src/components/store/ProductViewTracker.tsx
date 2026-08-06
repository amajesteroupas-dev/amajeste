"use client";

import { useEffect } from "react";

/** Conta 1 visita por produto por sessão do navegador */
export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    if (!productId || typeof window === "undefined") return;
    const key = `majeste-viewed-${productId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage indisponível — ainda tenta registrar
    }
    fetch(`/api/products/${productId}/view`, { method: "POST" }).catch(() => {});
  }, [productId]);

  return null;
}
