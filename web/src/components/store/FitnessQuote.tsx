"use client";

import { useEffect, useState } from "react";
import { FITNESS_QUOTES, fitnessQuoteForDate } from "@/lib/fitness-quotes";

const ROTATE_MS = 12_000;

export function FitnessQuote({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(() => {
    const text = fitnessQuoteForDate();
    const i = FITNESS_QUOTES.indexOf(text);
    return i >= 0 ? i : 0;
  });
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % FITNESS_QUOTES.length);
        setVisible(true);
      }, 280);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  const text = FITNESS_QUOTES[index] ?? FITNESS_QUOTES[0];

  return (
    <div className={className} aria-live="polite">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#a67c6a] mb-2">
        Força · saúde · você
      </p>
      <p
        className="text-lg md:text-xl font-bold leading-snug text-[#2a2420] transition-opacity duration-300"
        style={{
          fontFamily: "var(--font-display)",
          opacity: visible ? 1 : 0,
        }}
      >
        “{text}”
      </p>
    </div>
  );
}
