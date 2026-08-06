"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Foto do banco de imagens (recortada) */
  imageUrl?: string | null;
};

const SIZE_ROW = { label: "VESTE", m: "36 - 38", g: "40 - 42" } as const;

const ROWS = [
  { label: "BUSTO", m: "80 - 100 CM", g: "101 - 112 CM" },
  { label: "CINTURA", m: "68 - 80 CM", g: "81 - 94 CM" },
  { label: "QUADRIL", m: "90 - 105 CM", g: "105 - 122 CM" },
] as const;

const MARKERS = [
  { label: "BUSTO", top: "29%" },
  { label: "CINTURA", top: "41%" },
  { label: "QUADRIL", top: "51%" },
] as const;

function MeasurePhoto({ src }: { src: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[240px] aspect-[9/16]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Como medir busto, cintura e quadril"
        className="absolute inset-0 h-full w-full object-contain object-bottom drop-shadow-[0_12px_24px_rgba(42,36,32,0.18)]"
      />
      {/* Linha vertical central */}
      <div
        className="pointer-events-none absolute left-1/2 top-[12%] bottom-[8%] w-px -translate-x-1/2 border-l border-dashed border-white/90"
        aria-hidden
      />
      {MARKERS.map((m) => (
        <div
          key={m.label}
          className="pointer-events-none absolute left-0 right-0 flex items-center"
          style={{ top: m.top }}
        >
          <span className="relative z-[1] ml-0 text-[10px] sm:text-[11px] font-semibold tracking-[0.12em] text-[#5c4336] bg-[#f3ebe3]/85 px-1.5 py-0.5">
            {m.label}
          </span>
          <span
            className="absolute left-[18%] right-[14%] border-t border-dashed border-white/95"
            aria-hidden
          />
        </div>
      ))}
    </div>
  );
}

export function SizeGuideModal({ open, onClose, imageUrl }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/55 flex items-center justify-center p-3 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-auto bg-[#f3ebe3] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 md:px-5 bg-[#f3ebe3]/90 backdrop-blur-sm border-b border-[#e0d4c8]">
          <h2
            id="size-guide-title"
            className="text-base md:text-lg font-semibold text-[#3d2f28]"
          >
            Guia de medidas
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#5c4336] hover:bg-black/5 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] gap-6 md:gap-8 p-5 md:p-8 items-center">
          <div className="flex justify-center">
            {imageUrl ? (
              <MeasurePhoto src={imageUrl} />
            ) : (
              <p className="text-sm text-[#6b5f56]">Foto do guia indisponível.</p>
            )}
          </div>

          <div>
            <h3
              className="text-2xl md:text-3xl tracking-wide text-[#5c4336] uppercase"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Tabela de medidas
            </h3>
            <p className="mt-2 text-sm text-[#5a4a42] leading-relaxed max-w-md">
              Use a fita métrica para descobrir suas medidas e saber qual o
              tamanho ideal para você.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[280px] text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="py-2.5 px-3" aria-hidden>
                      &nbsp;
                    </th>
                    <th className="py-2.5 px-3 text-center font-semibold tracking-wider bg-[#5c4336] text-white">
                      M
                    </th>
                    <th className="py-2.5 px-3 text-center font-semibold tracking-wider bg-[#5c4336] text-white">
                      G
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white/70">
                    <th className="py-2.5 px-3 text-left font-semibold tracking-wider text-xs bg-[#5c4336] text-white">
                      {SIZE_ROW.label}
                    </th>
                    <td className="py-2.5 px-3 text-center text-[#3d2f28] border border-[#e8ddd2]">
                      {SIZE_ROW.m}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#3d2f28] border border-[#e8ddd2]">
                      {SIZE_ROW.g}
                    </td>
                  </tr>
                  {ROWS.map((row, i) => (
                    <tr
                      key={row.label}
                      className={
                        i % 2 === 0 ? "bg-[#ebe0d4]/80" : "bg-white/70"
                      }
                    >
                      <th className="py-2.5 px-3 text-left font-semibold text-[#5c4336] tracking-wider text-xs">
                        {row.label}
                      </th>
                      <td className="py-2.5 px-3 text-center text-[#3d2f28] border border-[#e8ddd2]">
                        {row.m}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[#3d2f28] border border-[#e8ddd2]">
                        {row.g}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 text-xs sm:text-sm text-[#5a4a42] leading-relaxed border-t border-[#e0d4c8] pt-4 max-w-md">
              <p className="font-medium text-[#3d2f28]">Referência da modelo</p>
              <p className="mt-2">A modelo veste 36/38.</p>
              <p className="mt-1">Medidas aproximadas:</p>
              <ul className="mt-1 space-y-0.5 list-none">
                <li>Busto 88&nbsp;cm</li>
                <li>Cintura 73&nbsp;cm</li>
                <li>Quadril 96&nbsp;cm</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
