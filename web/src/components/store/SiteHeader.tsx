"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/categoria/conjunto-legging", label: "Conjunto Legging" },
  { href: "/categoria/conjunto-short", label: "Conjunto Short" },
  { href: "/categoria/macacao", label: "Macacão" },
  { href: "/categoria/macaquinho", label: "Macaquinho" },
  { href: "/categoria/diversos", label: "Diversos" },
  { href: "/categoria/outlet", label: "Outlet" },
  { href: "/contato", label: "Contato" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const totalItems = useCart((s) => s.totalItems());
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-ink text-white">
      <div className="container-maj flex h-16 items-center justify-between gap-4">
        <button
          className="lg:hidden"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link href="/" className="flex items-center gap-2">
          <span className="text-gold text-xl leading-none">♛</span>
          <span
            className="font-[family-name:var(--font-display)] text-2xl tracking-[0.08em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Majesté
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-5 text-[0.68rem] font-semibold uppercase tracking-[0.14em]">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "hover:text-gold transition-colors",
                pathname === item.href && "text-gold"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            aria-label="Buscar"
            onClick={() => setSearchOpen((v) => !v)}
            className="hover:text-gold transition-colors"
          >
            <Search size={18} />
          </button>
          <Link
            href="/carrinho"
            className="relative hover:text-gold transition-colors"
            aria-label="Carrinho"
          >
            <ShoppingBag size={18} />
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-ink">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-white/10 bg-ink px-4 py-3">
          <form action="/busca" className="container-maj">
            <input
              name="q"
              placeholder="Pesquise aqui..."
              className="w-full bg-transparent border-b border-white/30 py-2 text-sm outline-none placeholder:text-white/50"
              autoFocus
            />
          </form>
        </div>
      )}

      {open && (
        <nav className="lg:hidden border-t border-white/10 bg-ink px-6 py-4 flex flex-col gap-3 text-sm uppercase tracking-[0.12em]">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="py-1 hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
          <Link href="/politicas-de-troca" onClick={() => setOpen(false)}>
            Políticas de Troca
          </Link>
        </nav>
      )}
    </header>
  );
}
