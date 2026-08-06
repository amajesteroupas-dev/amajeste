"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, Search, X, ZoomIn } from "lucide-react";

type Props = {
  src: string;
  alt: string;
  /** zoom da lupa no hover (desktop) */
  lensScale?: number;
};

export function ProductImageZoom({ src, alt, lensScale = 2.4 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [lightbox, setLightbox] = useState(false);
  const [lbScale, setLbScale] = useState(1);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia("(hover: none)").matches);
  }, []);

  const moveLens = useCallback((clientX: number, clientY: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setOrigin({ x, y });
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox]);

  function openLightbox() {
    setLbScale(1);
    setLightbox(true);
  }

  return (
    <>
      <div
        ref={wrapRef}
        className="product-zoom-wrap relative h-full w-full bg-[#ebe4db]"
        onMouseEnter={() => !isTouch && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onMouseMove={(e) => moveLens(e.clientX, e.clientY)}
        onTouchStart={() => setHovering(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={`product-zoom-img h-full w-full object-cover select-none ${
            hovering ? "product-zoom-img--active" : ""
          }`}
          style={
            hovering
              ? {
                  transformOrigin: `${origin.x}% ${origin.y}%`,
                  transform: `scale(${lensScale})`,
                }
              : undefined
          }
        />

        {/* Lente circular (desktop) */}
        {hovering ? (
          <div
            className="product-zoom-lens pointer-events-none hidden md:block"
            style={{
              left: `${origin.x}%`,
              top: `${origin.y}%`,
            }}
            aria-hidden
          />
        ) : null}

        <button
          type="button"
          onClick={openLightbox}
          className="product-zoom-trigger absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/95 px-3 py-2 text-[11px] uppercase tracking-wider text-[#333] shadow-sm border border-black/8 hover:bg-white transition-colors"
          aria-label="Ampliar foto do produto"
        >
          <Search size={14} strokeWidth={2.2} />
          <span className="hidden sm:inline">Ampliar</span>
          <ZoomIn size={14} className="sm:hidden" />
        </button>

        {!hovering && !isTouch ? (
          <p className="product-zoom-hint pointer-events-none absolute bottom-3 left-3 hidden md:flex items-center gap-1.5 bg-black/45 text-white text-[10px] uppercase tracking-wider px-2.5 py-1.5">
            <Search size={12} />
            Passe o mouse para zoom
          </p>
        ) : null}
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-[80] bg-black/92 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Visualização ampliada do produto"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
            <p className="text-white/80 text-xs uppercase tracking-wider truncate">
              {alt}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="p-2 text-white/90 hover:bg-white/10"
                aria-label="Diminuir zoom"
                onClick={() => setLbScale((s) => Math.max(1, s - 0.35))}
              >
                <Minus size={18} />
              </button>
              <span className="text-white/70 text-xs min-w-[3rem] text-center">
                {Math.round(lbScale * 100)}%
              </span>
              <button
                type="button"
                className="p-2 text-white/90 hover:bg-white/10"
                aria-label="Aumentar zoom"
                onClick={() => setLbScale((s) => Math.min(3.5, s + 0.35))}
              >
                <Plus size={18} />
              </button>
              <button
                type="button"
                className="p-2 text-white/90 hover:bg-white/10 ml-1"
                aria-label="Fechar"
                onClick={() => setLightbox(false)}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div
            className="flex-1 overflow-auto flex items-center justify-center p-4 touch-pan-x touch-pan-y"
            onClick={() => setLightbox(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-h-full max-w-full object-contain transition-transform duration-200 select-none"
              style={{ transform: `scale(${lbScale})` }}
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />
          </div>

          <p className="text-center text-white/50 text-[11px] pb-4 px-4">
            Use +/− para ver detalhes do tecido · Toque fora para fechar
          </p>
        </div>
      ) : null}
    </>
  );
}
