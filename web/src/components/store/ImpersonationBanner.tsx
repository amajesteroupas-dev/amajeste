"use client";

import { signOut, useSession } from "next-auth/react";

/** Aviso quando o admin está navegando como a cliente. */
export function ImpersonationBanner() {
  const { data } = useSession();
  const impersonatedBy = data?.user?.impersonatedBy;
  if (!impersonatedBy) return null;

  return (
    <div className="bg-ink text-surface text-sm px-4 py-2 flex flex-wrap items-center justify-between gap-2">
      <span>
        Você está vendo a loja como <strong>{data?.user?.name || data?.user?.email}</strong>.
      </span>
      <button
        type="button"
        className="underline underline-offset-2"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Sair da conta da cliente
      </button>
    </div>
  );
}
