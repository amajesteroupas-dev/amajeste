"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/store/BrandLogo";

const PHRASES = [
  "Vista sua força",
  "Cada treino, sua coroa",
  "Fitness com presença",
  "Movimento que eleva",
  "Sua melhor versão começa aqui",
  "Força, elegância e constância",
];

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios = (window.navigator as Navigator & { standalone?: boolean })
    .standalone;
  return Boolean(mq || ios);
}

/**
 * Tela de entrada do PWA (app instalado pelo Chrome).
 * Logo marca + frase de incentivo, depois some suavemente.
 */
export function PwaEntrySplash() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const phrase = useMemo(
    () => PHRASES[Math.floor(Math.random() * PHRASES.length)],
    []
  );

  useEffect(() => {
    if (!isStandaloneDisplay()) return;

    const seenKey = "majeste-pwa-splash-session";
    try {
      if (sessionStorage.getItem(seenKey) === "1") return;
    } catch {
      /* ignore */
    }

    setVisible(true);
    const leaveAt = window.setTimeout(() => setLeaving(true), 2200);
    const hideAt = window.setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem(seenKey, "1");
      } catch {
        /* ignore */
      }
    }, 2900);

    return () => {
      window.clearTimeout(leaveAt);
      window.clearTimeout(hideAt);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center px-8 transition-opacity duration-700 ${
        leaving ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background:
          "radial-gradient(120% 80% at 50% 20%, #3a322c 0%, #1a1612 55%, #0f0d0b 100%)",
      }}
      role="dialog"
      aria-label="Bem-vinda à Majesté"
    >
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, #c9a24a 0%, transparent 40%), radial-gradient(circle at 80% 70%, #a85f64 0%, transparent 35%)",
        }}
      />

      <div
        className={`relative flex flex-col items-center gap-8 transition-all duration-700 ${
          leaving ? "translate-y-2 scale-[0.98]" : "translate-y-0 scale-100"
        }`}
      >
        <div className="pwa-splash-rise">
          <BrandLogo size="lg" showTagline showCrown />
        </div>

        <p
          className="text-center max-w-[16rem] pwa-splash-rise pwa-splash-rise-delay-1"
          style={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontSize: "1.35rem",
            fontWeight: 500,
            letterSpacing: "0.04em",
            color: "#e8d090",
            lineHeight: 1.35,
          }}
        >
          {phrase}
        </p>

        <div className="h-px w-16 pwa-splash-rise pwa-splash-rise-delay-2 bg-gradient-to-r from-transparent via-[#c9a24a] to-transparent" />

        <p className="text-[10px] uppercase tracking-[0.35em] text-[#a8842f]/80 pwa-splash-rise pwa-splash-rise-delay-3">
          Majesté
        </p>
      </div>
    </div>
  );
}
