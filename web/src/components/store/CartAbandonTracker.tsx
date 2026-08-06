"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";

function getCartSessionId() {
  try {
    const key = "majeste-cart-sid";
    let id = localStorage.getItem(key);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID().replace(/-/g, "").slice(0, 32)
          : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Sincroniza o carrinho local com o servidor (recuperação de abandono). */
export function CartAbandonTracker() {
  const items = useCart((s) => s.items);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sessionId = getCartSessionId();
    if (!sessionId) return;

    const email =
      localStorage.getItem("majeste-checkout-email") ||
      sessionStorage.getItem("majeste-checkout-email") ||
      "";
    const phone =
      localStorage.getItem("majeste-checkout-phone") ||
      sessionStorage.getItem("majeste-checkout-phone") ||
      "";

    const t = window.setTimeout(() => {
      fetch("/api/analytics/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          email: email || undefined,
          phone: phone || undefined,
          items: items.map((i) => ({
            variantId: i.variantId,
            productId: i.productId,
            productName: i.productName,
            slug: i.slug,
            size: i.size,
            color: i.color,
            price: i.price,
            imageUrl: i.imageUrl,
            quantity: i.quantity,
          })),
        }),
        keepalive: true,
      }).catch(() => {});
    }, 800);

    return () => window.clearTimeout(t);
  }, [items]);

  return null;
}

export function saveCheckoutContact(email: string, phone: string) {
  try {
    if (email) {
      localStorage.setItem("majeste-checkout-email", email.trim().toLowerCase());
      sessionStorage.setItem(
        "majeste-checkout-email",
        email.trim().toLowerCase()
      );
    }
    if (phone) {
      localStorage.setItem("majeste-checkout-phone", phone);
      sessionStorage.setItem("majeste-checkout-phone", phone);
    }
  } catch {
    /* ignore */
  }
}

export function getCartSessionIdPublic() {
  return getCartSessionId();
}
