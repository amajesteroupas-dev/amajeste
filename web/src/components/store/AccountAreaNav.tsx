"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Heart,
  LayoutDashboard,
  Package,
  UserRound,
  Images,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const CONTA_LINKS: NavItem[] = [
  { href: "/conta", label: "Painel", icon: LayoutDashboard, exact: true },
  { href: "/conta/perfil", label: "Perfil", icon: UserRound },
  { href: "/conta/favoritos", label: "Favoritos", icon: Heart },
  { href: "/conta/pedidos", label: "Pedidos", icon: Package },
  { href: "/looks", label: "Galeria Majesté", icon: Images },
  { href: "/academia/galeria", label: "Seja Influence", icon: Sparkles },
];

/** Área de looks / influence (academia fitness desativada). */
const INFLUENCE_LINKS: NavItem[] = [
  { href: "/academia/galeria", label: "Seja Influence", icon: Sparkles, exact: true },
  { href: "/looks", label: "Galeria Majesté", icon: Images },
  { href: "/conta", label: "Minha conta", icon: UserRound },
];

export function AccountAreaNav({
  variant = "conta",
}: {
  variant?: "conta" | "academia";
}) {
  const pathname = usePathname();
  const links = variant === "academia" ? INFLUENCE_LINKS : CONTA_LINKS;

  return (
    <nav className="flex flex-wrap gap-2">
      {links.map((l) => {
        const active = l.exact
          ? pathname === l.href
          : pathname === l.href || pathname.startsWith(`${l.href}/`);
        const Icon = l.icon;
        return (
          <Link
            key={l.href + l.label}
            href={l.href}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2.5 text-[11px] uppercase tracking-[0.12em] border transition-colors",
              active
                ? "bg-[#a85f64]/12 text-[#8a4a4f] border-[#a85f64]/45 shadow-[inset_0_-2px_0_0_#a85f64]"
                : "bg-white/80 text-[#3a322c] border-[#2a2420]/12 hover:border-[#a85f64]/50 hover:text-[#a85f64]"
            )}
          >
            <Icon size={15} strokeWidth={1.6} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
