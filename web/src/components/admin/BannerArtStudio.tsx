"use client";

import { BANNER_FONTS, FONT_SIZES, TEXT_COLORS } from "@/lib/banner-text";
import {
  ART_KIND_LABEL,
  arrasouArtPreset,
  newArtLayer,
  type BannerArtKind,
  type BannerArtLayer,
} from "@/lib/banner-art";

type Props = {
  layers: BannerArtLayer[];
  selectedId: string | null;
  artEditMode: boolean;
  onArtEditMode: (on: boolean) => void;
  onChange: (layers: BannerArtLayer[]) => void;
  onSelect: (id: string | null) => void;
};

const ADD_BTNS: { kind: BannerArtKind; label: string }[] = [
  { kind: "headline", label: "+ Título" },
  { kind: "tagline", label: "+ Frase" },
  { kind: "sparkle", label: "+ Brilho" },
  { kind: "line", label: "+ Linha" },
];

export function BannerArtStudio({
  layers,
  selectedId,
  artEditMode,
  onArtEditMode,
  onChange,
  onSelect,
}: Props) {
  const selected = layers.find((l) => l.id === selectedId) || null;

  function add(kind: BannerArtKind) {
    const layer = newArtLayer(kind);
    if (kind === "sparkle" && layers.some((l) => l.kind === "sparkle")) {
      layer.x = 20 + Math.round(Math.random() * 60);
      layer.y = 20 + Math.round(Math.random() * 55);
    }
    onChange([...layers, layer]);
    onSelect(layer.id);
    onArtEditMode(true);
  }

  function patch(partial: Partial<BannerArtLayer>) {
    if (!selected) return;
    onChange(
      layers.map((l) => (l.id === selected.id ? { ...l, ...partial } : l))
    );
  }

  function remove(id: string) {
    onChange(layers.filter((l) => l.id !== id));
    if (selectedId === id) onSelect(null);
  }

  return (
    <div className="border border-black/10 bg-[#faf7f3] p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted font-semibold">
            Overlay — arte no vídeo
          </p>
          <p className="text-[12px] text-muted mt-1 leading-snug">
            Como no Canva: coloque o vídeo e edite texto, brilhos e linha em
            cima. Arraste na prévia.
          </p>
        </div>
        <button
          type="button"
          className={`btn !py-1.5 !px-3 text-[10px] shrink-0 ${
            artEditMode ? "btn-dark" : "btn-outline"
          }`}
          onClick={() => onArtEditMode(!artEditMode)}
        >
          {artEditMode ? "Editando arte" : "Editar arte"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ADD_BTNS.map((b) => (
          <button
            key={b.kind}
            type="button"
            className="btn btn-outline !py-1.5 !px-2.5 text-[11px]"
            onClick={() => add(b.kind)}
          >
            {b.label}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-dark !py-1.5 !px-2.5 text-[11px]"
          onClick={() => {
            const next = arrasouArtPreset();
            onChange(next);
            onSelect(next[0]?.id || null);
            onArtEditMode(true);
          }}
        >
          Modelo Arrasou
        </button>
      </div>

      {layers.length === 0 ? (
        <p className="text-[12px] text-muted leading-snug">
          Nenhum elemento ainda. Use <strong>Modelo Arrasou</strong> para a
          arte pronta, ou adicione título / frase / brilho um a um.
        </p>
      ) : (
        <ul className="space-y-1">
          {layers.map((l, i) => (
            <li key={l.id}>
              <button
                type="button"
                className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left text-[12px] border ${
                  selectedId === l.id
                    ? "border-ink bg-white"
                    : "border-black/10 bg-white/70"
                }`}
                onClick={() => {
                  onSelect(l.id);
                  onArtEditMode(true);
                }}
              >
                <span>
                  {ART_KIND_LABEL[l.kind]}
                  {l.text?.trim()
                    ? ` — ${l.text.replace(/\s+/g, " ").slice(0, 28)}`
                    : ` ${i + 1}`}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  className="text-[10px] uppercase tracking-wide text-[var(--rose)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(l.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(l.id);
                    }
                  }}
                >
                  Tirar
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <div className="border border-black/10 bg-white p-3 space-y-3">
          <p className="text-[11px] uppercase tracking-wider text-muted">
            Editar {ART_KIND_LABEL[selected.kind]}
          </p>
          {selected.kind === "headline" || selected.kind === "tagline" ? (
            <>
              <label className="block text-xs uppercase tracking-wider text-muted">
                Texto
                <textarea
                  className="input mt-1 min-h-[88px] text-sm"
                  value={selected.text || ""}
                  onChange={(e) => patch({ text: e.target.value })}
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-muted">
                Fonte
                <select
                  className="input mt-1"
                  value={selected.fontId || "display"}
                  onChange={(e) => patch({ fontId: e.target.value })}
                >
                  {BANNER_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs uppercase tracking-wider text-muted">
                Tamanho
                <select
                  className="input mt-1"
                  value={selected.size || (selected.kind === "headline" ? 42 : 12)}
                  onChange={(e) => patch({ size: Number(e.target.value) })}
                >
                  {FONT_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={selected.bold === true}
                  onChange={(e) => patch({ bold: e.target.checked })}
                />
                Negrito
              </label>
            </>
          ) : (
            <label className="block text-xs uppercase tracking-wider text-muted">
              Tamanho do elemento
              <input
                type="range"
                min={0.4}
                max={2.2}
                step={0.05}
                className="w-full mt-1"
                value={selected.scale || 1}
                onChange={(e) => patch({ scale: Number(e.target.value) })}
              />
            </label>
          )}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted mb-2">
              Cor
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  className="h-6 w-6 border border-black/20"
                  style={{ background: c }}
                  onClick={() => patch({ color: c })}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {layers.length > 0 ? (
        <button
          type="button"
          className="text-xs underline text-[var(--rose)]"
          onClick={() => {
            onChange([]);
            onSelect(null);
          }}
        >
          Limpar arte do vídeo
        </button>
      ) : null}
    </div>
  );
}
