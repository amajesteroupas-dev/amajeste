"use client";

import { useState } from "react";
import {
  COLOR_PALETTE,
  colorToHex,
  formatSwatchHex,
  isLightSwatch,
  normalizeColor,
  parseSwatchHex,
  swatchBackground,
} from "@/lib/colors";
import { ColorEyedropperTools } from "@/components/admin/ColorEyedropperTools";

type ColorValue = { name: string; hex: string };

type Props = {
  values: ColorValue[];
  onChange: (colors: ColorValue[]) => void;
  label?: string;
  imageUrls?: string[];
};

export function ColorMultiSwatchPicker({
  values,
  onChange,
  label = "Cores",
  imageUrls = [],
}: Props) {
  const selectedNames = new Set(values.map((v) => normalizeColor(v.name)));
  const [customName, setCustomName] = useState("");
  const [customHex, setCustomHex] = useState("#cccccc");
  const [toolsOpen, setToolsOpen] = useState(false);

  function toggle(c: ColorValue) {
    const name = normalizeColor(c.name);
    if (selectedNames.has(name)) {
      onChange(values.filter((v) => normalizeColor(v.name) !== name));
    } else {
      onChange([...values, { name, hex: c.hex }]);
    }
  }

  function addCustom() {
    const name = normalizeColor(customName.trim() || "Personalizada");
    if (!name) return;
    const hex = formatSwatchHex(
      parseSwatchHex(customHex).primary,
      parseSwatchHex(customHex).secondary
    );
    const without = values.filter((v) => normalizeColor(v.name) !== name);
    onChange([...without, { name, hex }]);
    setCustomName("");
    setToolsOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-muted">
          {label}
        </span>
        <span className="text-xs text-muted">
          {values.length
            ? `${values.length} selecionada(s)`
            : "Selecione uma ou mais"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COLOR_PALETTE.map((c) => {
          const active = selectedNames.has(c.name);
          const light = isLightSwatch(c.hex);
          return (
            <button
              key={c.name}
              type="button"
              title={c.name}
              aria-label={c.name}
              aria-pressed={active}
              onClick={() => toggle(c)}
              className={`h-7 w-7 rounded-full border-2 transition-transform ${
                active
                  ? "border-ink scale-110 ring-1 ring-ink ring-offset-1"
                  : light
                    ? "border-black/35 hover:scale-105"
                    : "border-black/15 hover:scale-105"
              }`}
              style={{ background: swatchBackground(c.hex) }}
            />
          );
        })}
      </div>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {values.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => toggle(c)}
              className="inline-flex items-center gap-1.5 text-xs border border-black/15 px-2 py-1 bg-white hover:border-ink"
              title="Clique para remover"
            >
              <span
                className={`h-3.5 w-3.5 rounded-full border ${
                  isLightSwatch(c.hex) ? "border-black/40" : "border-black/20"
                }`}
                style={{
                  background: swatchBackground(c.hex || colorToHex(c.name)),
                }}
              />
              {c.name}
              <span className="text-muted">×</span>
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="btn btn-outline !py-1.5 !text-xs"
        onClick={() => setToolsOpen((v) => !v)}
      >
        {toolsOpen
          ? "Fechar cor personalizada"
          : "+ Cor personalizada (conta-gotas / 2 cores)"}
      </button>

      {toolsOpen && (
        <div className="space-y-2 border border-black/10 bg-white p-3">
          <label className="block text-xs uppercase tracking-wider text-muted">
            Nome da cor
            <input
              className="input mt-1"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ex: Preto/Branco, Mescla rosa…"
            />
          </label>
          <ColorEyedropperTools
            hex={customHex}
            imageUrls={imageUrls}
            onChange={setCustomHex}
          />
          <button
            type="button"
            className="btn btn-primary !py-2"
            onClick={addCustom}
            disabled={!customName.trim() && !customHex}
          >
            Adicionar esta cor
          </button>
        </div>
      )}

      <p className="text-[11px] text-muted">
        Clique nas bolinhas da paleta ou crie uma cor com conta-gotas / 2 tons.
        Cada cor vira variante do produto (com cada tamanho).
      </p>
    </div>
  );
}
