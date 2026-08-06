"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "majeste_cookie_ok";

export function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  function accept() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] p-3 md:p-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-3xl border border-[#2a2420]/15 bg-[#faf7f3] p-4 md:p-5 shadow-sm">
        <p className="text-sm text-[#3a322c] leading-relaxed">
          Usamos cookies essenciais para carrinho, login e segurança da compra.
          Ao continuar, você concorda com nossa{" "}
          <Link href="/cookies" className="underline text-[#95752c]">
            Política de Cookies
          </Link>{" "}
          e{" "}
          <Link href="/privacidade" className="underline text-[#95752c]">
            Privacidade (LGPD)
          </Link>
          .
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary !py-2 text-xs" onClick={accept}>
            Entendi
          </button>
          <Link href="/privacidade" className="btn btn-outline !py-2 text-xs">
            Saiba mais
          </Link>
        </div>
      </div>
    </div>
  );
}
