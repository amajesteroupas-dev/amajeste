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

type Props = {
  value: string;
  hex?: string;
  onChange: (color: { name: string; hex: string }) => void;
  /** cores extras já usadas no produto */
  extraColors?: string[];
  /** fotos do produto para o conta-gotas */
  imageUrls?: string[];
  label?: string;
};

export function ColorSwatchPicker({
  value,
  hex,
  onChange,
  extraColors = [],
  imageUrls = [],
  label = "Cor",
}: Props) {
  const currentHex = hex || colorToHex(value);
  const [toolsOpen, setToolsOpen] = useState(false);

  const extras = extraColors
    .map((c) => normalizeColor(c))
    .filter((c) => c && !COLOR_PALETTE.some((p) => p.name === c));

  const options = [
    ...COLOR_PALETTE,
    ...extras.map((name) => ({ name, hex: colorToHex(name) })),
  ];

  const selected = value ? normalizeColor(value) : "";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wider text-muted">
          {label}
        </span>
        {selected ? (
          <span className="text-xs text-ink flex items-center gap-1.5">
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full border shrink-0 ${
                isLightSwatch(currentHex)
                  ? "border-black/40"
                  : "border-black/20"
              }`}
              style={{ background: swatchBackground(currentHex) }}
            />
            {selected}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {options.map((c) => {
          const active = selected === c.name;
          const light = isLightSwatch(c.hex);
          return (
            <button
              key={c.name}
              type="button"
              title={c.name}
              aria-label={c.name}
              aria-pressed={active}
              onClick={() => onChange({ name: c.name, hex: c.hex })}
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

      <input
        className="input !py-2 text-sm"
        placeholder="Nome da cor (ex: Preto/Branco)"
        value={value}
        onChange={(e) => {
          const name = e.target.value;
          onChange({
            name,
            hex: currentHex.includes("/")
              ? currentHex
              : colorToHex(name || "Cinza"),
          });
        }}
      />

      <button
        type="button"
        className="btn btn-outline !py-1.5 !text-xs"
        onClick={() => setToolsOpen((v) => !v)}
      >
        {toolsOpen
          ? "Ocultar conta-gotas / 2 cores"
          : "Conta-gotas e bolinha de 2 cores"}
      </button>

      {toolsOpen && (
        <ColorEyedropperTools
          hex={currentHex}
          imageUrls={imageUrls}
          onChange={(nextHex) => {
            const { primary, secondary } = parseSwatchHex(nextHex);
            onChange({
              name: value.trim() || (secondary ? "Bicolor" : "Personalizada"),
              hex: formatSwatchHex(primary, secondary),
            });
          }}
        />
      )}

      <p className="text-[11px] text-muted">
        Use a paleta, o conta-gotas do navegador (Chrome/Edge) ou clique na foto
        do produto. Marque “Bolinha com 2 cores” para combinações.
      </p>
    </div>
  );
}
