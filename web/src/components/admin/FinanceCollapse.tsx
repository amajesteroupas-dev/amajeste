"use client";

import { type ReactNode, useState } from "react";

type Props = {
  title: string;
  /** Resumo visível com a seção fechada */
  summary?: ReactNode;
  defaultOpen?: boolean;
  /** Controlado (opcional) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children: ReactNode;
  /** Conteúdo à direita do título (ex.: botões) — não dispara o toggle */
  actions?: ReactNode;
};

export function FinanceCollapse({
  title,
  summary,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  className = "",
  children,
  actions,
}: Props) {
  const [internal, setInternal] = useState(defaultOpen);
  const open = controlledOpen ?? internal;

  function toggle() {
    const next = !open;
    if (controlledOpen === undefined) setInternal(next);
    onOpenChange?.(next);
  }

  return (
    <section
      className={`border border-black/8 bg-white ${className}`.trim()}
    >
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex-1 flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#faf7f3]/80 transition-colors min-w-0"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center border border-black/15 bg-[#faf7f3] text-sm font-semibold text-[#2a2420] tabular-nums"
            aria-hidden
          >
            {open ? "−" : "+"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7468]">
              {title}
            </span>
            {!open && summary ? (
              <span className="block mt-0.5 text-xs text-[#5c534c] truncate">
                {summary}
              </span>
            ) : null}
          </span>
        </button>
        {actions ? (
          <div className="flex items-center gap-1.5 pr-2 shrink-0">{actions}</div>
        ) : null}
      </div>
      {open ? (
        <div className="border-t border-black/8 px-3 pb-3 pt-3 space-y-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}
