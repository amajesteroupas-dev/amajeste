"use client";

import { useState } from "react";

type Props = {
  code: string;
};

export function PixCopyPaste({ code }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.getElementById("pix-copy-input") as HTMLTextAreaElement | null;
      if (el) {
        el.focus();
        el.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[#2a2420]">Pix copia e cola</p>
      <p className="text-xs text-muted">
        Se preferir, copie o código e cole no app do seu banco.
      </p>
      <textarea
        id="pix-copy-input"
        readOnly
        value={code}
        rows={3}
        className="w-full resize-none border border-line bg-background p-3 text-[11px] leading-relaxed break-all font-mono text-[#2a2420] outline-none"
        aria-label="Código Pix copia e cola"
        onFocus={(e) => e.target.select()}
      />
      <button
        type="button"
        onClick={() => void copy()}
        className="btn btn-primary w-full sm:w-auto"
      >
        {copied ? "Código copiado!" : "Copiar código Pix"}
      </button>
    </div>
  );
}
