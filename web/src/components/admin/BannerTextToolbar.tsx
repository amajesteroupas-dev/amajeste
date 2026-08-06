"use client";

import {
  BANNER_FONTS,
  CTA_BG_COLORS,
  FONT_SIZES,
  STROKE_COLORS,
  STROKE_WIDTHS,
  TEXT_COLORS,
  applyStyleToSelection,
  effectiveRuns,
  getLayerStyle,
  selectionStyle,
  type BannerTextStyle,
  type TextLayerKey,
  type TextLayerStyle,
  type TextRunStyle,
  type TextSelection,
} from "@/lib/banner-text";

const LAYERS: { id: TextLayerKey; label: string }[] = [
  { id: "title", label: "Título" },
  { id: "highlight", label: "Destaque" },
  { id: "subtitle", label: "Subtítulo" },
  { id: "promo", label: "Promoção" },
  { id: "tagline", label: "Linha final" },
  { id: "cta", label: "Botão" },
];

type Props = {
  textStyle: BannerTextStyle;
  activeLayer: TextLayerKey;
  onActiveLayerChange: (layer: TextLayerKey) => void;
  onChange: (next: BannerTextStyle) => void;
  /** Texto atual da camada ativa (para aplicar estilo só na seleção) */
  layerText: string;
  selection: TextSelection | null;
  textAlign: string;
  onTextAlignChange: (align: string) => void;
};

export function BannerTextToolbar({
  textStyle,
  activeLayer,
  onActiveLayerChange,
  onChange,
  layerText,
  selection,
  textAlign,
  onTextAlignChange,
}: Props) {
  const layer = getLayerStyle(textStyle, activeLayer);
  const runs = effectiveRuns(layer, layerText);
  const hasSelection =
    !!selection && selection.end > selection.start && layerText.length > 0;
  const selStyle = hasSelection
    ? selectionStyle(runs, selection!.start, selection!.end)
    : null;

  function patchLayer(partial: Partial<TextLayerStyle>) {
    onChange({
      ...textStyle,
      [activeLayer]: { ...layer, ...partial },
    });
  }

  function patch(partial: TextRunStyle) {
    if (hasSelection) {
      const nextRuns = applyStyleToSelection(
        runs,
        selection!.start,
        selection!.end,
        partial
      );
      onChange({
        ...textStyle,
        [activeLayer]: { ...layer, runs: nextRuns },
      });
      return;
    }
    patchLayer(partial);
  }

  const displaySize =
    (hasSelection ? selStyle?.size : undefined) ?? layer.size ?? 16;
  const displayFont =
    (hasSelection ? selStyle?.font : undefined) ?? layer.font ?? "display";
  const displayBold =
    (hasSelection ? selStyle?.bold : undefined) ?? !!layer.bold;
  const displayItalic =
    (hasSelection ? selStyle?.italic : undefined) ?? !!layer.italic;
  const displayUnderline =
    (hasSelection ? selStyle?.underline : undefined) ?? !!layer.underline;
  const displayColor =
    (hasSelection ? selStyle?.color : undefined) ?? layer.color ?? "#5c4336";
  const displayStrokeColor =
    (hasSelection ? selStyle?.strokeColor : undefined) ??
    layer.strokeColor ??
    "#000000";
  const displayStrokeWidth =
    (hasSelection ? selStyle?.strokeWidth : undefined) ??
    layer.strokeWidth ??
    0;
  const displayBg = layer.bgColor || "#a85f64";
  const displayBorder = layer.borderColor || "transparent";
  const displayRadius = layer.borderRadius ?? 0;
  const isCta = activeLayer === "cta";

  function patchStroke(partial: {
    strokeColor?: string;
    strokeWidth?: number;
  }) {
    const nextWidth =
      partial.strokeWidth !== undefined
        ? partial.strokeWidth
        : displayStrokeWidth || 1;
    const nextColor = partial.strokeColor ?? displayStrokeColor;
    if (partial.strokeWidth === 0) {
      patch({ strokeWidth: 0, strokeColor: nextColor });
      return;
    }
    patch({
      strokeColor: nextColor,
      strokeWidth: nextWidth > 0 ? nextWidth : 1,
    });
  }

  const selectedLabel = hasSelection
    ? layerText.slice(selection!.start, selection!.end)
    : "";

  return (
    <div className="border border-black/10 bg-[#f3f0eb] overflow-hidden">
      <div className="flex flex-wrap gap-1 border-b border-black/10 bg-white px-2 py-1.5">
        {LAYERS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onActiveLayerChange(l.id)}
            className={`px-2.5 py-1 text-[11px] uppercase tracking-wider ${
              activeLayer === l.id
                ? "bg-ink text-white"
                : "text-ink/70 hover:bg-black/5"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 p-2">
        <select
          className="input !py-1.5 !px-2 text-sm min-w-[160px] !bg-white"
          value={displayFont}
          onChange={(e) => patch({ font: e.target.value })}
          title="Fonte"
        >
          {BANNER_FONTS.map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.family }}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          className="input !py-1.5 !px-2 text-sm w-[72px] !bg-white"
          value={displaySize}
          onChange={(e) => patch({ size: Number(e.target.value) })}
          title="Tamanho"
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          type="button"
          title="Aumentar"
          className="btn btn-outline !py-1.5 !px-2 text-sm"
          onClick={() =>
            patch({
              size: Math.min(144, displaySize + 4),
            })
          }
        >
          A+
        </button>
        <button
          type="button"
          title="Diminuir"
          className="btn btn-outline !py-1.5 !px-2 text-sm"
          onClick={() =>
            patch({
              size: Math.max(12, displaySize - 4),
            })
          }
        >
          A−
        </button>

        <span className="w-px h-6 bg-black/15 mx-0.5" />

        <button
          type="button"
          title="Negrito"
          className={`btn !py-1.5 !px-2.5 text-sm font-bold ${
            displayBold ? "btn-dark" : "btn-outline"
          }`}
          onClick={() => patch({ bold: !displayBold })}
        >
          N
        </button>
        <button
          type="button"
          title="Itálico"
          className={`btn !py-1.5 !px-2.5 text-sm italic ${
            displayItalic ? "btn-dark" : "btn-outline"
          }`}
          onClick={() => patch({ italic: !displayItalic })}
        >
          I
        </button>
        <button
          type="button"
          title="Sublinhado"
          className={`btn !py-1.5 !px-2.5 text-sm underline ${
            displayUnderline ? "btn-dark" : "btn-outline"
          }`}
          onClick={() => patch({ underline: !displayUnderline })}
        >
          S
        </button>
        <button
          type="button"
          title="Maiúsculas (camada inteira)"
          className={`btn !py-1.5 !px-2 text-[11px] ${
            layer.uppercase ? "btn-dark" : "btn-outline"
          }`}
          onClick={() => patchLayer({ uppercase: !layer.uppercase })}
        >
          Aa
        </button>

        {!isCta ? (
          <>
            <span className="w-px h-6 bg-black/15 mx-0.5" />

            <button
              type="button"
              title="Alinhar à esquerda"
              className={`btn !py-1.5 !px-2 text-[11px] ${
                textAlign === "left" ? "btn-dark" : "btn-outline"
              }`}
              onClick={() => onTextAlignChange("left")}
            >
              Esq
            </button>
            <button
              type="button"
              title="Centralizar"
              className={`btn !py-1.5 !px-2 text-[11px] ${
                textAlign === "center" ? "btn-dark" : "btn-outline"
              }`}
              onClick={() => onTextAlignChange("center")}
            >
              Cen
            </button>
            <button
              type="button"
              title="Alinhar à direita"
              className={`btn !py-1.5 !px-2 text-[11px] ${
                textAlign === "right" ? "btn-dark" : "btn-outline"
              }`}
              onClick={() => onTextAlignChange("right")}
            >
              Dir
            </button>
          </>
        ) : null}

        <span className="w-px h-6 bg-black/15 mx-0.5" />

        <label className="inline-flex items-center gap-1.5 text-xs text-muted">
          {isCta ? "Texto" : "Cor"}
          <input
            type="color"
            value={displayColor}
            onChange={(e) => patch({ color: e.target.value })}
            className="h-8 w-10 border border-black/15 bg-white p-0.5 cursor-pointer"
          />
        </label>
        <div className="flex flex-wrap gap-1">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => patch({ color: c })}
              className={`h-6 w-6 border ${
                displayColor === c ? "border-ink scale-110" : "border-black/15"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>

        <span className="w-px h-6 bg-black/15 mx-0.5" />

        <label className="inline-flex items-center gap-1.5 text-xs text-muted">
          Contorno
          <input
            type="color"
            value={displayStrokeColor}
            onChange={(e) => patchStroke({ strokeColor: e.target.value })}
            className="h-8 w-10 border border-black/15 bg-white p-0.5 cursor-pointer"
            title="Cor da borda das letras"
          />
        </label>
        <select
          className="input !py-1.5 !px-2 text-sm w-[88px] !bg-white"
          value={displayStrokeWidth}
          onChange={(e) =>
            patchStroke({ strokeWidth: Number(e.target.value) })
          }
          title="Espessura do contorno"
        >
          {STROKE_WIDTHS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1">
          {STROKE_COLORS.map((c) => (
            <button
              key={`stroke-${c}`}
              type="button"
              title={`Contorno ${c}`}
              onClick={() => patchStroke({ strokeColor: c })}
              className={`h-6 w-6 border ${
                displayStrokeWidth > 0 && displayStrokeColor === c
                  ? "border-ink scale-110"
                  : "border-black/15"
              }`}
              style={{
                background: `linear-gradient(135deg, ${c} 45%, transparent 46%), #f3f0eb`,
              }}
            />
          ))}
        </div>
        <button
          type="button"
          className="btn btn-outline !py-1.5 !px-2 text-[11px]"
          onClick={() => patchStroke({ strokeWidth: 0 })}
          title="Remover contorno das letras"
        >
          Sem contorno
        </button>
      </div>

      {isCta ? (
        <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2 border-t border-black/8 pt-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            Fundo
            <input
              type="color"
              value={displayBg === "transparent" ? "#a85f64" : displayBg}
              onChange={(e) => patchLayer({ bgColor: e.target.value })}
              className="h-8 w-10 border border-black/15 bg-white p-0.5 cursor-pointer"
            />
          </label>
          <div className="flex flex-wrap gap-1">
            {CTA_BG_COLORS.map((c) => (
              <button
                key={`bg-${c}`}
                type="button"
                title={c}
                onClick={() => patchLayer({ bgColor: c })}
                className={`h-6 w-6 border ${
                  displayBg === c ? "border-ink scale-110" : "border-black/15"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>

          <span className="w-px h-6 bg-black/15 mx-0.5" />

          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            Borda botão
            <input
              type="color"
              value={
                !displayBorder || displayBorder === "transparent"
                  ? "#a85f64"
                  : displayBorder
              }
              onChange={(e) => patchLayer({ borderColor: e.target.value })}
              className="h-8 w-10 border border-black/15 bg-white p-0.5 cursor-pointer"
            />
          </label>
          <button
            type="button"
            className="btn btn-outline !py-1.5 !px-2 text-[11px]"
            onClick={() => patchLayer({ borderColor: "transparent" })}
          >
            Sem borda
          </button>

          <span className="w-px h-6 bg-black/15 mx-0.5" />

          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            Cantos
            <select
              className="input !py-1.5 !px-2 text-sm w-[88px] !bg-white"
              value={displayRadius}
              onChange={(e) =>
                patchLayer({ borderRadius: Number(e.target.value) })
              }
            >
              <option value={0}>Reto</option>
              <option value={4}>4px</option>
              <option value={8}>8px</option>
              <option value={12}>12px</option>
              <option value={20}>20px</option>
              <option value={999}>Pílula</option>
            </select>
          </label>

          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            Padding
            <select
              className="input !py-1.5 !px-2 text-sm w-[100px] !bg-white"
              value={`${layer.paddingY ?? 12}x${layer.paddingX ?? 22}`}
              onChange={(e) => {
                const [py, px] = e.target.value.split("x").map(Number);
                patchLayer({ paddingY: py, paddingX: px });
              }}
            >
              <option value="8x14">Compacto</option>
              <option value="12x22">Normal</option>
              <option value="14x28">Grande</option>
              <option value="16x36">Extra</option>
            </select>
          </label>
        </div>
      ) : null}

      <p className="px-3 pb-2 text-[11px] text-muted">
        {isCta ? (
          <>
            Editando: <strong>Botão (Comprar agora)</strong> — fonte, tamanho,
            cor do texto, contorno das letras, fundo, borda e cantos. O texto do
            botão fica no campo “Botão” à direita.
          </>
        ) : hasSelection ? (
          <>
            Selecionado: <strong>&ldquo;{selectedLabel}&rdquo;</strong>
            {" — "}
            mude tamanho/fonte/cor/contorno só neste trecho (como no Word).
          </>
        ) : (
          <>
            Editando:{" "}
            <strong>{LAYERS.find((l) => l.id === activeLayer)?.label}</strong>
            {" — "}
            no painel à direita, selecione parte do texto (ex.: só o{" "}
            <strong>10</strong>) e use esta barra. Contorno = borda das letras.
          </>
        )}
      </p>
    </div>
  );
}
