"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { colorToHex, swatchBackground } from "@/lib/colors";
import { ChevronRight } from "lucide-react";

export type FacetColor = { name: string; count: number; hex: string | null };
export type FacetSize = { name: string; count: number };

type Props = {
  colors: FacetColor[];
  sizes: FacetSize[];
  priceMin: number;
  priceMax: number;
};

export function CategoryFilters({ colors, sizes, priceMin, priceMax }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [showAllColors, setShowAllColors] = useState(false);

  const selectedColors = searchParams.getAll("cor");
  const selectedSizes = searchParams.getAll("tamanho");
  const [min, setMin] = useState(searchParams.get("min") || String(priceMin));
  const [max, setMax] = useState(searchParams.get("max") || String(priceMax));

  const visibleColors = showAllColors ? colors : colors.slice(0, 8);

  function toggleParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll(key);
    params.delete(key);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    next.forEach((v) => params.append(key, v));
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyPrice() {
    const params = new URLSearchParams(searchParams.toString());
    if (min) params.set("min", min);
    else params.delete("min");
    if (max) params.set("max", max);
    else params.delete("max");
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    router.push(pathname);
    setMin(String(priceMin));
    setMax(String(priceMax));
  }

  const panel = useMemo(
    () => (
      <aside className="filter-panel">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-wide text-[#1a2744]">
            Filtrar por
          </h2>
          {(selectedColors.length > 0 ||
            selectedSizes.length > 0 ||
            searchParams.get("min") ||
            searchParams.get("max")) && (
            <button
              type="button"
              className="text-xs text-[var(--rose-dark)]"
              onClick={clearAll}
            >
              Limpar
            </button>
          )}
        </div>

        <section className="filter-section">
          <h3>Cor</h3>
          <ul className="space-y-2">
            {visibleColors.map((c) => {
              const checked = selectedColors.includes(c.name);
              return (
                <li key={c.name}>
                  <label className="flex items-center gap-2 text-sm text-[#333] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleParam("cor", c.name)}
                    />
                    <span className="flex-1">
                      {c.name}{" "}
                      <span className="text-muted">({c.count})</span>
                    </span>
                    <span
                      className="h-4 w-4 rounded-full border border-black/15 shrink-0"
                      style={{
                        background: swatchBackground(
                          colorToHex(c.name, c.hex)
                        ),
                      }}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
          {colors.length > 8 && (
            <button
              type="button"
              className="text-xs text-[#1a2744] mt-2 underline"
              onClick={() => setShowAllColors((v) => !v)}
            >
              {showAllColors ? "Ver menos" : "Ver mais"}
            </button>
          )}
        </section>

        <section className="filter-section">
          <h3>Tamanho</h3>
          <ul className="space-y-2">
            {sizes.map((s) => {
              const checked = selectedSizes.includes(s.name);
              return (
                <li key={s.name}>
                  <label className="flex items-center gap-2 text-sm text-[#333] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleParam("tamanho", s.name)}
                    />
                    <span>
                      {s.name}{" "}
                      <span className="text-muted">({s.count})</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="filter-section border-b-0">
          <h3>Preço</h3>
          <div className="flex items-end gap-2">
            <label className="flex-1 text-xs text-muted">
              De
              <input
                type="number"
                step="0.1"
                className="input mt-1 !py-2"
                value={min}
                onChange={(e) => setMin(e.target.value)}
              />
            </label>
            <label className="flex-1 text-xs text-muted">
              Até
              <input
                type="number"
                step="0.1"
                className="input mt-1 !py-2"
                value={max}
                onChange={(e) => setMax(e.target.value)}
              />
            </label>
            <button
              type="button"
              aria-label="Aplicar preço"
              className="h-10 w-10 bg-[#1a2744] text-white flex items-center justify-center shrink-0"
              onClick={applyPrice}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      </aside>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      visibleColors,
      sizes,
      min,
      max,
      selectedColors,
      selectedSizes,
      showAllColors,
      colors.length,
    ]
  );

  return (
    <>
      <div className="lg:hidden mb-4">
        <button
          type="button"
          className="btn btn-outline w-full"
          onClick={() => setOpen(true)}
        >
          Filtrar por
        </button>
      </div>
      <div className="hidden lg:block sticky top-24">{panel}</div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[min(100%,320px)] bg-white p-5 overflow-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold">Filtros</span>
              <button type="button" onClick={() => setOpen(false)}>
                Fechar
              </button>
            </div>
            {panel}
          </div>
        </div>
      )}
    </>
  );
}
