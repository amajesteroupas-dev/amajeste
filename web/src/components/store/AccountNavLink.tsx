"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { User } from "lucide-react";

/** Link da loja: só olha a sessão de CLIENTE (cookie da loja). */
export function AccountNavLink() {
  const { data, status } = useSession();
  const role = (data?.user as { role?: string } | undefined)?.role;
  const isCustomer = status === "authenticated" && role === "CUSTOMER";
  const href = isCustomer ? "/conta" : "/entrar";
  const label = isCustomer ? "Conta" : "Entrar";

  return (
    <Link
      href={href}
      className="relative text-[#2a2420] hover:text-gold-dark inline-flex items-center gap-1"
      aria-label={label}
    >
      <User size={18} />
      <span className="hidden xl:inline text-xs uppercase tracking-[0.1em]">
        {label}
      </span>
    </Link>
  );
}
