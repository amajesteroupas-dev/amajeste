"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  attributionForCheckout,
  captureAttributionFromUrl,
} from "@/lib/traffic-attribution-client";

function getSessionId() {
  try {
    const key = "majeste-visit-sid";
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

/** Registra 1 visita por path/sessão/dia (servidor deduplica) + captura UTM. */
export function SiteVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    captureAttributionFromUrl();
  }, [pathname]);

  useEffect(() => {
    if (!pathname || typeof window === "undefined") return;
    if (pathname.startsWith("/admin")) return;

    const day = new Date().toISOString().slice(0, 10);
    const key = `majeste-site-hit:${day}:${pathname}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* segue */
    }

    const sessionId = getSessionId();
    const attribution = attributionForCheckout();
    fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        sessionId,
        userAgent: navigator.userAgent,
        attribution,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
