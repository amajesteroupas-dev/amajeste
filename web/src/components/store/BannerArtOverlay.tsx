"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useRef,
} from "react";
import {
  artFontFamily,
  type BannerArtLayer,
} from "@/lib/banner-art";

function SparkleIcon({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      aria-hidden
      fill={color}
    >
      <path d="M12 0.6 14.6 9.4 23.4 12 14.6 14.6 12 23.4 9.4 14.6 0.6 12 9.4 9.4Z" />
    </svg>
  );
}

function HeadlineText({ text, size }: { text: string; size: number }) {
  const lines = text.split("\n");
  if (lines.length <= 1) return <>{text}</>;
  const last = lines[lines.length - 1];
  const rest = lines.slice(0, -1).join("\n");
  return (
    <>
      {rest}
      {"\n"}
      <span
        className="banner-art-headline-last"
        style={{ fontSize: `calc(${size} * 0.13vw + ${size * 0.55}px)` }}
      >
        {last}
      </span>
    </>
  );
}

type Props = {
  layers: BannerArtLayer[];
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
};

export function BannerArtOverlay({
  layers,
  editable = false,
  selectedId,
  onSelect,
  onMove,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; pointerId: number } | null>(null);

  if (!layers.length) return null;

  function posFromEvent(e: ReactPointerEvent<HTMLElement>) {
    const box = boxRef.current;
    if (!box) return null;
    const r = box.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return null;
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    return {
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    };
  }

  function onLayerDown(
    e: ReactPointerEvent<HTMLButtonElement>,
    id: string
  ) {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(id);
    drag.current = { id, pointerId: e.pointerId };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onLayerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!editable || !drag.current) return;
    if (e.pointerId !== drag.current.pointerId) return;
    const pos = posFromEvent(e);
    if (!pos) return;
    onMove?.(drag.current.id, pos.x, pos.y);
  }

  function onLayerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag.current || e.pointerId !== drag.current.pointerId) return;
    drag.current = null;
  }

  return (
    <div
      ref={boxRef}
      className={`banner-art-overlay${editable ? " is-editable" : ""}`}
    >
      {layers.map((layer) => {
        const color = layer.color || "#ffffff";
        const selected = editable && selectedId === layer.id;
        const common = {
          left: `${layer.x}%`,
          top: `${layer.y}%`,
          transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
          color,
        } as const;

        if (layer.kind === "sparkle") {
          const px = Math.round(18 * (layer.scale || 1));
          return (
            <button
              key={layer.id}
              type="button"
              data-no-pan
              className={`banner-art-layer banner-art-sparkle${
                selected ? " is-selected" : ""
              }`}
              style={{ ...common, width: px, height: px }}
              onPointerDown={(e) => onLayerDown(e, layer.id)}
              onPointerMove={onLayerMove}
              onPointerUp={onLayerUp}
              onPointerCancel={onLayerUp}
              tabIndex={editable ? 0 : -1}
              aria-label="Brilho"
            >
              <SparkleIcon color={color} />
            </button>
          );
        }

        if (layer.kind === "line") {
          const w = Math.round(72 * (layer.scale || 1));
          return (
            <button
              key={layer.id}
              type="button"
              data-no-pan
              className={`banner-art-layer banner-art-line${
                selected ? " is-selected" : ""
              }`}
              style={{ ...common, width: `${w}%` }}
              onPointerDown={(e) => onLayerDown(e, layer.id)}
              onPointerMove={onLayerMove}
              onPointerUp={onLayerUp}
              onPointerCancel={onLayerUp}
              tabIndex={editable ? 0 : -1}
              aria-label="Linha"
            >
              <span style={{ background: color }} />
            </button>
          );
        }

        const size = layer.size || (layer.kind === "headline" ? 42 : 12);
        const text =
          layer.text ||
          (layer.kind === "headline" ? "Título" : "Frase");
        return (
          <button
            key={layer.id}
            type="button"
            data-no-pan
            className={`banner-art-layer banner-art-${layer.kind}${
              selected ? " is-selected" : ""
            }`}
            style={{
              ...common,
              fontFamily: artFontFamily(layer.fontId),
              fontSize: `clamp(${Math.max(12, size * 0.42)}px, ${
                size * 0.11
              }vw, ${size}px)`,
              fontWeight: layer.bold ? 700 : 400,
              color,
            }}
            onPointerDown={(e) => onLayerDown(e, layer.id)}
            onPointerMove={onLayerMove}
            onPointerUp={onLayerUp}
            onPointerCancel={onLayerUp}
            tabIndex={editable ? 0 : -1}
          >
            {layer.kind === "headline" ? (
              <HeadlineText text={text} size={size} />
            ) : (
              text
            )}
          </button>
        );
      })}
    </div>
  );
}
