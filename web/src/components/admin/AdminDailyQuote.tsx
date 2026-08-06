"use client";

import { useEffect, useState } from "react";
import {
  ADMIN_QUOTES,
  ADMIN_QUOTE_LABELS,
  quoteIndexForDate,
  type AdminQuote,
} from "@/lib/admin-quotes";

const ROTATE_MS = 14_000;

export function AdminDailyQuote() {
  const [index, setIndex] = useState(() => quoteIndexForDate());
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % ADMIN_QUOTES.length);
        setVisible(true);
      }, 320);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  const quote: AdminQuote = ADMIN_QUOTES[index] ?? ADMIN_QUOTES[0];

  return (
    <div
      className="admin-daily-quote mt-3 max-w-2xl"
      aria-live="polite"
    >
      <p
        className="text-[10px] uppercase tracking-[0.2em] text-[#a67c6a] mb-1.5 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {ADMIN_QUOTE_LABELS[quote.category]} · nunca desista
      </p>
      <p
        className="text-[17px] md:text-lg leading-snug text-[#2a2420] font-bold transition-opacity duration-300"
        style={{
          fontFamily: "var(--font-display)",
          opacity: visible ? 1 : 0,
        }}
      >
        “{quote.text}”
      </p>
    </div>
  );
}
