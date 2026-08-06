"use client";

import Link from "next/link";
import { BannerCarousel, type StoreBanner } from "@/components/store/BannerCarousel";
import { AdminDailyQuote } from "@/components/admin/AdminDailyQuote";

type Props = {
  banners: StoreBanner[];
  adminName?: string | null;
};

export function AdminWelcomeBanner({ banners, adminName }: Props) {
  const firstName = adminName?.trim() || "Majesté";

  return (
    <section className="admin-welcome mb-8 overflow-hidden border border-black/8 bg-white">
      <div className="admin-welcome-top px-5 py-4 md:px-6 md:py-5 flex flex-wrap items-end justify-between gap-3 border-b border-black/6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted mb-1">
            Painel Majesté
          </p>
          <h1
            className="text-3xl md:text-4xl text-[#2a2420]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Olá, {firstName}
          </h1>
          <AdminDailyQuote />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/banners" className="btn btn-outline !py-2 !px-3 text-xs">
            Editar banners
          </Link>
          <Link href="/" className="btn btn-primary !py-2 !px-3 text-xs">
            Ver loja
          </Link>
        </div>
      </div>

      {banners.length > 0 ? (
        <div className="admin-welcome-banner">
          {/* Mesmos banners/tamanhos da home — sem forçar compact */}
          <BannerCarousel banners={banners} />
        </div>
      ) : (
        <div className="admin-welcome-empty px-6 py-12 text-center bg-[linear-gradient(135deg,#f7f0e8_0%,#efe4d8_50%,#f3ebe3_100%)]">
          <p
            className="text-2xl text-[#3a2f28] mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Vista sua força
          </p>
          <p className="text-sm text-muted mb-4">
            Ainda não há banner ativo. Monte um com suas fotos no editor.
          </p>
          <Link href="/admin/banners" className="btn btn-primary !py-2">
            Criar banner
          </Link>
        </div>
      )}
    </section>
  );
}
