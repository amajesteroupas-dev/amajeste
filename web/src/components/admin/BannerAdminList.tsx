"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseCutoutLayers, type CutoutLayer } from "@/lib/cutout-layout";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  highlight: string | null;
  promoText: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string;
  layout: string;
  bgColor: string | null;
  panelColor: string | null;
  textAlign: string;
  overlay: number;
  imageFit?: string;
  focalX?: number;
  focalY?: number;
  imageZoom?: number;
  cutoutImages?: unknown;
  sortOrder: number;
  active: boolean;
};

const LAYOUT_LABEL: Record<string, string> = {
  studio: "Estúdio",
  cutouts: "Modelos + fundo",
  fullbleed: "Tela cheia",
  promo: "Promoção",
  overlay: "Sobreposição",
};

function BannerListThumb({ b }: { b: Banner }) {
  const layout = b.layout || "studio";
  const bg = b.bgColor || "#f0e8df";
  const layers: CutoutLayer[] =
    layout === "cutouts"
      ? parseCutoutLayers(
          Array.isArray(b.cutoutImages) && (b.cutoutImages as unknown[]).length
            ? b.cutoutImages
            : b.imageUrl
              ? [{ url: b.imageUrl, x: 72, y: 0, scale: 1 }]
              : []
        )
      : [];

  if (layout === "cutouts") {
    return (
      <div
        className="relative w-full h-full overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 55% 90% at 18% 110%, rgba(214, 196, 176, 0.45) 0%, transparent 70%),
            linear-gradient(180deg, ${bg} 0%, ${bg} 100%)
          `,
        }}
      >
        <div className="absolute inset-y-0 left-0 w-[42%] flex flex-col justify-center px-2.5 z-[2]">
          <p
            className="text-[9px] leading-tight font-semibold uppercase tracking-wide text-[#2a2420] line-clamp-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {b.title}
          </p>
          {b.highlight ? (
            <p className="text-[8px] font-semibold text-[#2a2420] mt-0.5 truncate">
              {b.highlight}
            </p>
          ) : null}
        </div>
        <div className="absolute inset-0 left-[38%] right-0">
          {layers.map((layer, i) => (
            <div
              key={`${b.id}-t-${i}`}
              className="absolute bottom-0"
              style={{
                left: `${layer.x}%`,
                bottom: `${layer.y}%`,
                zIndex: i + 1,
                transform: `translateX(-50%) scale(${Math.min(layer.scale, 1.2)})`,
                transformOrigin: "bottom center",
                height: "92%",
                width: "auto",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={layer.url}
                alt=""
                className="h-full w-auto max-w-none object-contain object-bottom pointer-events-none"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === "promo") {
    return (
      <div className="relative w-full h-full flex overflow-hidden">
        <div
          className="w-[48%] h-full flex flex-col justify-center px-2.5"
          style={{ background: b.panelColor || "#1a2744" }}
        >
          <p className="text-[9px] font-semibold text-white line-clamp-2 uppercase">
            {b.title}
          </p>
          {b.highlight ? (
            <p className="text-[10px] font-bold text-white mt-0.5 truncate">
              {b.highlight}
            </p>
          ) : null}
        </div>
        <div className="flex-1 relative" style={{ background: bg }}>
          {b.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-contain object-bottom"
            />
          ) : null}
        </div>
      </div>
    );
  }

  if (layout === "studio") {
    return (
      <div
        className="relative w-full h-full overflow-hidden flex"
        style={{ background: bg }}
      >
        <div className="w-[40%] flex flex-col justify-center px-2.5 z-[1]">
          <p
            className="text-[9px] leading-tight font-semibold uppercase text-[#2a2420] line-clamp-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {b.title}
          </p>
        </div>
        <div className="flex-1 relative">
          {b.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full"
              style={{
                objectFit: b.imageFit === "cover" ? "cover" : "contain",
                objectPosition: `${b.focalX ?? 50}% ${b.focalY ?? 50}%`,
              }}
            />
          ) : null}
        </div>
      </div>
    );
  }

  // fullbleed / overlay / fallback
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#222]">
      {b.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={b.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: `${b.focalX ?? 50}% ${b.focalY ?? 50}%`,
          }}
        />
      ) : null}
      {b.overlay > 0 ? (
        <div
          className="absolute inset-0"
          style={{ background: `rgba(20,14,10,${b.overlay})` }}
        />
      ) : null}
      <div className="absolute inset-0 flex items-end p-2">
        <p className="text-[9px] font-semibold text-white line-clamp-2 drop-shadow">
          {b.title}
        </p>
      </div>
    </div>
  );
}

export function BannerAdminList() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/banners");
    if (!res.ok) {
      setError("Falha ao carregar banners");
      setLoading(false);
      return;
    }
    setBanners(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createBanner() {
    const res = await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blank: true,
        title: "",
        subtitle: null,
        ctaLabel: null,
        ctaHref: "/categoria/conjunto-legging",
        imageUrl: "",
        overlay: 0,
        layout: "studio",
        bgColor: "#f0e8df",
        panelColor: "#ebe3d8",
        bannerSize: "tall",
        imageFit: "contain",
        focalX: 50,
        focalY: 50,
        imageZoom: 1,
        active: false,
        videoPlaylist: [],
        videoLayout: "sequence",
      }),
    });
    if (res.ok) {
      const created = await res.json();
      window.location.href = `/admin/banners/${created.id}`;
    }
  }

  async function toggleActive(b: Banner) {
    await fetch("/api/admin/banners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, active: !b.active }),
    });
    load();
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = banners.findIndex((b) => b.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= banners.length) return;
    const next = [...banners];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setBanners(next);
    await fetch("/api/admin/banners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((b) => b.id) }),
    });
  }

  async function remove(id: string) {
    if (!confirm("Excluir este banner?")) return;
    await fetch(`/api/admin/banners?id=${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p className="text-muted">Carregando...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Banners</h1>
          <p className="text-sm text-muted mt-1">
            Novo banner começa só com o fundo — você adiciona textos, fotos ou
            vídeos. Ative quando estiver pronto.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={createBanner}>
          Novo banner
        </button>
      </div>

      <div className="space-y-3">
        {banners.map((b, i) => (
          <div
            key={b.id}
            className="bg-white border border-black/10 p-4 flex flex-col md:flex-row gap-4 items-stretch"
          >
            <div className="w-full md:w-56 aspect-[16/9] overflow-hidden border border-black/8 shrink-0 rounded-sm">
              <BannerListThumb b={b} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">
                {b.title?.trim() || "Banner sem título"}
              </p>
              <p className="text-sm text-muted truncate">
                {b.highlight || b.promoText || b.subtitle || "Sem textos ainda"}
              </p>
              <p className="text-xs text-muted mt-2">
                {b.active ? "Ativo" : "Inativo"} · ordem {i + 1} ·{" "}
                {LAYOUT_LABEL[b.layout] || b.layout || "Estúdio"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-start">
              <button
                type="button"
                className="btn btn-outline !py-2 !px-3 text-xs"
                onClick={() => move(b.id, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn-outline !py-2 !px-3 text-xs"
                onClick={() => move(b.id, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn-outline !py-2 !px-3 text-xs"
                onClick={() => toggleActive(b)}
              >
                {b.active ? "Desativar" : "Ativar"}
              </button>
              <Link
                href={`/admin/banners/${b.id}`}
                className="btn btn-dark !py-2 !px-3 text-xs"
              >
                Editar
              </Link>
              <button
                type="button"
                className="btn btn-outline !py-2 !px-3 text-xs text-red-700"
                onClick={() => remove(b.id)}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
        {banners.length === 0 && (
          <p className="text-muted bg-white border border-black/10 p-6">
            Nenhum banner ainda. Crie o primeiro para aparecer na home.
          </p>
        )}
      </div>
    </div>
  );
}
