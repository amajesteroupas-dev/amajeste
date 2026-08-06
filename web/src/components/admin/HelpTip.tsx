"use client";

import { useId, useState } from "react";

/** Interrogação com dica ao passar o mouse / focar */
export function HelpTip({ text }: { text: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle ml-1">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-label="Ajuda"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#c2a45b]/60 text-[10px] font-semibold text-[#9a782f] bg-[#fbf6eb] hover:bg-[#f3e8c8]"
      >
        ?
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute z-30 left-1/2 -translate-x-1/2 top-full mt-1.5 w-56 sm:w-64 rounded-sm border border-[#e8d9a8] bg-[#2a2420] px-2.5 py-2 text-[11px] leading-snug text-[#f7f1ea] shadow-lg normal-case tracking-normal font-normal"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
