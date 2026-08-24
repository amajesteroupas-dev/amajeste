"use client";

import { useEffect, useState } from "react";

type Props = {
  /** ISO date — reservedUntil do pedido */
  expiresAt: string;
  /** Se o pedido já foi pago, não mostra o timer */
  paid?: boolean;
  /** Se já cancelado no servidor */
  cancelled?: boolean;
};

function formatRemain(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PixPaymentTimer({ expiresAt, paid, cancelled }: Props) {
  const end = new Date(expiresAt).getTime();
  const [remainMs, setRemainMs] = useState(() => end - Date.now());

  useEffect(() => {
    if (paid || cancelled) return;
    const tick = () => setRemainMs(end - Date.now());
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [end, paid, cancelled]);

  if (paid) return null;

  if (cancelled || remainMs <= 0) {
    return (
      <div className="rounded-sm border border-[#a85f64]/35 bg-[#faf5f4] px-3 py-3 space-y-1">
        <p
          className="text-base text-[#a85f64]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Tempo esgotado
        </p>
        <p className="text-sm text-[#5c534c] leading-relaxed">
          O prazo de 5 minutos acabou. O pedido foi cancelado e o produto voltou
          para o estoque. Se ainda quiser a peça, faça um novo pedido.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-[#2a2420]/12 bg-[#faf7f3] px-3 py-3 space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-[#2a2420]">
          Tempo para pagar o Pix
        </p>
        <p
          className="text-2xl tabular-nums tracking-wide text-[#a85f64]"
          style={{ fontFamily: "var(--font-display)" }}
          aria-live="polite"
        >
          {formatRemain(remainMs)}
        </p>
      </div>
      <p className="text-xs text-[#5c534c] leading-relaxed">
        Pague em até <strong>5 minutos</strong>. Se não for pago nesse prazo, o
        pedido é cancelado automaticamente e o produto volta para o estoque.
      </p>
    </div>
  );
}
