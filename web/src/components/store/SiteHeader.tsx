"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/store/BrandLogo";
import { AccountNavLink } from "@/components/store/AccountNavLink";

const NAV = [
  { href: "/categoria/conjunto-legging", label: "Conjunto Legging" },
  { href: "/categoria/conjunto-short", label: "Conjunto Short" },
  { href: "/categoria/macacao", label: "Macacão" },
  { href: "/categoria/macaquinho", label: "Macaquinho" },
  { href: "/categoria/diversos", label: "Diversos" },
  { href: "/categoria/outlet", label: "Outlet" },
  { href: "/instagram", label: "Instagram" },
  { href: "/looks", label: "Looks" },
  { href: "/contato", label: "Contato" },
  { href: "/politicas-de-troca", label: "Trocas" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const totalItems = useCart((s) => s.totalItems());
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container-maj flex h-[88px] items-center justify-between gap-5 md:gap-6">
        <button
          className="lg:hidden text-[#2a2420]"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link
          href="/"
          className="shrink-0 -translate-y-1.5 md:-translate-y-2"
          aria-label="Majesté — início"
        >
          <BrandLogo size="md" className="md:hidden" />
          <BrandLogo size="lg" className="hidden md:inline-flex" />
        </Link>

        <nav className="hidden lg:flex flex-1 items-center justify-center gap-x-3 xl:gap-x-4 min-w-0">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn("nav-link", pathname === item.href && "is-active")}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            aria-label="Buscar"
            onClick={() => setSearchOpen((v) => !v)}
            className="hidden sm:inline-flex items-center gap-2 border border-[#2a2420]/25 bg-white/70 px-3 py-1.5 text-xs text-[#3a322c] hover:border-gold hover:text-gold-dark"
          >
            <Search size={14} />
            <span className="hidden xl:inline">Pesquise Aqui</span>
          </button>
          <button
            className="sm:hidden text-[#2a2420]"
            aria-label="Buscar"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search size={18} />
          </button>
          <AccountNavLink />
          <Link
            href="/carrinho"
            className="relative text-[#2a2420] hover:text-gold-dark"
            aria-label="Carrinho"
          >
            <ShoppingBag size={18} />
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center bg-gold px-1 text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-[#2a2420]/10 bg-[#faf7f3] px-4 py-3">
          <form action="/busca" className="container-maj">
            <input
              name="q"
              placeholder="Pesquise aqui..."
              className="w-full bg-white border border-[#2a2420]/20 px-3 py-2 text-sm text-[#2a2420] outline-none placeholder:text-[#2a2420]/45 focus:border-gold"
              autoFocus
            />
          </form>
        </div>
      )}

      {open && (
        <nav className="lg:hidden border-t border-[#2a2420]/10 bg-[#faf7f3] px-6 py-4 flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="nav-link py-2.5 border-b border-[#2a2420]/8 last:border-0"
            >
              {item.label === "Trocas" ? "Políticas de Troca" : item.label}
            </Link>
          ))}
          <Link
            href="/conta"
            onClick={() => setOpen(false)}
            className="nav-link py-2.5"
          >
            Minha conta
          </Link>
          <Link
            href="/looks"
            onClick={() => setOpen(false)}
            className="nav-link py-2.5"
          >
            Galeria Majesté
          </Link>
        </nav>
      )}
    </header>
  );
}
