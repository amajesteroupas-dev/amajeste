"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  src: string;
  alt: string;
  caption?: string | null;
  meta?: string | null;
};

export function LookPhotoLightbox({
  open,
  onClose,
  src,
  alt,
  caption,
  meta,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#2a2420]/80 p-3 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Foto do look"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 md:top-5 md:right-5 text-white/90 hover:text-white p-2"
        aria-label="Fechar"
      >
        <X size={22} />
      </button>
      <div
        className="max-h-full max-w-4xl w-full overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="mx-auto max-h-[82vh] w-auto max-w-full object-contain bg-[#ece6df] shadow-lg"
        />
        {(meta || caption) && (
          <div className="mx-auto mt-3 max-w-xl bg-white/95 px-4 py-3 text-left">
            {meta ? (
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a7468] mb-1">
                {meta}
              </p>
            ) : null}
            {caption ? (
              <p className="text-sm text-[#2a2420] leading-relaxed whitespace-pre-wrap">
                {caption}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
