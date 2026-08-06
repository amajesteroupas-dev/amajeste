"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import {
  formatSwatchHex,
  isLightSwatch,
  parseSwatchHex,
  swatchBackground,
} from "@/lib/colors";

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

function supportsEyeDropper() {
  return typeof window !== "undefined" && "EyeDropper" in window;
}

async function pickWithEyeDropper(): Promise<string | null> {
  if (!supportsEyeDropper()) return null;
  try {
    const EyeDropper = (window as unknown as { EyeDropper: EyeDropperCtor })
      .EyeDropper;
    const result = await new EyeDropper().open();
    return result.sRGBHex;
  } catch {
    return null;
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .toLowerCase()
  );
}

type Props = {
  hex: string;
  onChange: (hex: string) => void;
  /** URLs de fotos do produto para clicar e capturar cor */
  imageUrls?: string[];
};

export function ColorEyedropperTools({
  hex,
  onChange,
  imageUrls = [],
}: Props) {
  const { primary, secondary } = parseSwatchHex(hex);
  const [dual, setDual] = useState(Boolean(secondary));
  const [slot, setSlot] = useState<"primary" | "secondary">("primary");
  const [pickingImage, setPickingImage] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(
    imageUrls[0] || null
  );
  const [msg, setMsg] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setDual(Boolean(parseSwatchHex(hex).secondary));
  }, [hex]);

  useEffect(() => {
    if (!activeImage && imageUrls[0]) setActiveImage(imageUrls[0]);
  }, [imageUrls, activeImage]);

  const emit = useCallback(
    (a: string, b: string | null) => {
      onChange(formatSwatchHex(a, dual ? b || a : null));
    },
    [dual, onChange]
  );

  function setColor(next: string) {
    if (slot === "primary") {
      emit(next, secondary);
    } else {
      emit(primary, next);
    }
    setMsg(`Cor capturada: ${next}`);
  }

  async function onEyeDropper() {
    setMsg("Clique em qualquer cor da tela…");
    const picked = await pickWithEyeDropper();
    if (picked) setColor(picked);
    else if (!supportsEyeDropper()) {
      setMsg(
        "Conta-gotas do sistema indisponível neste navegador. Use o seletor ou clique na foto."
      );
    } else {
      setMsg("Captura cancelada");
    }
  }

  function loadImageToCanvas(url: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      const maxW = 420;
      const scale = Math.min(1, maxW / img.naturalWidth);
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.onerror = () => {
      setMsg("Não foi possível carregar a imagem para capturar cor.");
    };
    img.src = url;
  }

  useEffect(() => {
    if (pickingImage && activeImage) loadImageToCanvas(activeImage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickingImage, activeImage]);

  function onCanvasClick(e: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    setColor(rgbToHex(pixel[0], pixel[1], pixel[2]));
  }

  function onFile(file: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setActiveImage(url);
    setPickingImage(true);
  }

  return (
    <div className="space-y-3 border border-black/10 bg-[#faf7f3] p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`h-9 w-9 rounded-full border shrink-0 ${
            isLightSwatch(hex) ? "border-black/40" : "border-black/20"
          }`}
          style={{ background: swatchBackground(hex) }}
          title="Prévia da bolinha"
        />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="inline-flex items-center gap-1.5">
            <input
              type="color"
              value={primary}
              onChange={(e) => emit(e.target.value, secondary)}
              className="h-8 w-10 cursor-pointer border border-black/15 bg-white p-0.5"
              title="Cor 1"
            />
            <span className="text-xs text-muted font-mono">{primary}</span>
          </label>
          {dual && (
            <label className="inline-flex items-center gap-1.5">
              <input
                type="color"
                value={secondary || primary}
                onChange={(e) => emit(primary, e.target.value)}
                className="h-8 w-10 cursor-pointer border border-black/15 bg-white p-0.5"
                title="Cor 2"
              />
              <span className="text-xs text-muted font-mono">
                {secondary || primary}
              </span>
            </label>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="inline-flex items-center gap-2 text-xs border border-black/15 bg-white px-2.5 py-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={dual}
            onChange={(e) => {
              const on = e.target.checked;
              setDual(on);
              onChange(
                formatSwatchHex(primary, on ? secondary || "#ffffff" : null)
              );
              if (on) setSlot("secondary");
              else setSlot("primary");
            }}
          />
          Bolinha com 2 cores
        </label>

        {dual && (
          <div className="inline-flex border border-black/15 bg-white text-xs overflow-hidden">
            <button
              type="button"
              className={`px-2.5 py-1.5 ${
                slot === "primary" ? "bg-[#2a2420] text-white" : ""
              }`}
              onClick={() => setSlot("primary")}
            >
              Capturar cor 1
            </button>
            <button
              type="button"
              className={`px-2.5 py-1.5 ${
                slot === "secondary" ? "bg-[#2a2420] text-white" : ""
              }`}
              onClick={() => setSlot("secondary")}
            >
              Capturar cor 2
            </button>
          </div>
        )}

        <button
          type="button"
          className="btn btn-outline !py-1.5 !text-xs"
          onClick={onEyeDropper}
          title="Conta-gotas do sistema (Chrome/Edge)"
        >
          Conta-gotas
        </button>
        <button
          type="button"
          className="btn btn-outline !py-1.5 !text-xs"
          onClick={() => {
            setPickingImage((v) => !v);
            setMsg(
              pickingImage
                ? ""
                : "Clique na foto para capturar a cor do pixel"
            );
          }}
        >
          {pickingImage ? "Fechar foto" : "Capturar na foto"}
        </button>
        <label className="btn btn-outline !py-1.5 !text-xs cursor-pointer">
          Enviar imagem
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      {msg ? <p className="text-[11px] text-[#6b5f56]">{msg}</p> : null}

      {pickingImage && (
        <div className="space-y-2">
          {imageUrls.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {imageUrls.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(url)}
                  className={`h-12 w-10 overflow-hidden border ${
                    activeImage === url
                      ? "border-[#2a2420]"
                      : "border-black/15"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          <canvas
            ref={canvasRef}
            onClick={onCanvasClick}
            className="max-w-full cursor-crosshair border border-black/15 bg-white"
          />
          <p className="text-[11px] text-muted">
            Clique no ponto da imagem para a{" "}
            {dual ? (slot === "primary" ? "cor 1" : "cor 2") : "cor"}.
          </p>
        </div>
      )}
    </div>
  );
}
