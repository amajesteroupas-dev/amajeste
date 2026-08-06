"use client";

import {
  ATTR_COOKIE_NAME,
  ATTR_STORAGE_KEY,
  ATTR_TTL_DAYS,
  emptyAttribution,
  isAttributionFresh,
  parseAttributionFromSearch,
  parseAttributionPayload,
  type TrafficAttribution,
} from "@/lib/traffic-attribution";

function writeCookie(value: string) {
  try {
    const maxAge = ATTR_TTL_DAYS * 24 * 60 * 60;
    document.cookie = `${ATTR_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function saveAttribution(attr: TrafficAttribution) {
  try {
    const json = JSON.stringify(attr);
    localStorage.setItem(ATTR_STORAGE_KEY, json);
    writeCookie(json);
  } catch {
    /* ignore */
  }
}

export function loadAttribution(): TrafficAttribution | null {
  try {
    const raw = localStorage.getItem(ATTR_STORAGE_KEY);
    if (raw) {
      const parsed = parseAttributionPayload(JSON.parse(raw));
      if (parsed && isAttributionFresh(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  try {
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${ATTR_COOKIE_NAME}=`));
    if (match) {
      const val = decodeURIComponent(match.slice(ATTR_COOKIE_NAME.length + 1));
      const parsed = parseAttributionPayload(JSON.parse(val));
      if (parsed && isAttributionFresh(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Captura UTM da URL atual e mescla com atribuição existente (first-touch na janela). */
export function captureAttributionFromUrl(): TrafficAttribution | null {
  if (typeof window === "undefined") return null;
  const fromUrl = parseAttributionFromSearch(
    new URLSearchParams(window.location.search)
  );
  const existing = loadAttribution();

  if (!fromUrl) return existing;

  // First-touch: se já há atribuição fresca, só atualiza se veio click id novo
  if (existing && isAttributionFresh(existing)) {
    if (fromUrl.clickId && fromUrl.clickId !== existing.clickId) {
      const merged = { ...existing, clickId: fromUrl.clickId };
      saveAttribution(merged);
      return merged;
    }
    return existing;
  }

  const next = fromUrl || emptyAttribution();
  saveAttribution(next);
  return next;
}

export function attributionForCheckout(): TrafficAttribution | null {
  captureAttributionFromUrl();
  return loadAttribution();
}
