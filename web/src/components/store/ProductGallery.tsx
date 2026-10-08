"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { pickImageForColor } from "@/lib/colors";
import { mediaSrc } from "@/lib/media-src";
import { ProductImageZoom } from "@/components/store/ProductImageZoom";
import { FavoriteHeartButton } from "@/components/store/FavoriteHeartButton";
import { hasProductVideo, resolveVideoPlayback } from "@/lib/videos";

type Img = { url: string; alt: string | null };

type Props = {
  images: Img[];
  name: string;
  selectedColor?: string | null;
  productId?: string;
  /** Vídeo deste produto — aparece como última miniatura da galeria. */
  videoUrl?: string | null;
  /** @deprecated Vídeos de categoria vão no ícone flutuante. */
  videoUrls?: string[];
};

type Slide =
  | { kind: "image"; url: string; alt: string | null }
  | { kind: "video"; url: string };

export function ProductGallery({
  images,
  name,
  selectedColor,
  productId,
  videoUrl,
}: Props) {
  const imageList = useMemo(
    () => (images.length ? images : [{ url: "", alt: name }]),
    [images, name]
  );
  const hasVideo = Boolean(videoUrl && hasProductVideo(videoUrl));

  const slides: Slide[] = useMemo(() => {
    const out: Slide[] = imageList.map((img) => ({
      kind: "image" as const,
      url: img.url,
      alt: img.alt,
    }));
    if (hasVideo && videoUrl) {
      out.push({ kind: "video", url: videoUrl });
    }
    return out;
  }, [imageList, hasVideo, videoUrl]);

  const [index, setIndex] = useState(0);
  const current = slides[index] || slides[0];
  const playback =
    current?.kind === "video" ? resolveVideoPlayback(current.url) : null;

  const videoPoster =
    imageList.find((img) => img.url)?.url || imageList[0]?.url || "";

  useEffect(() => {
    if (!selectedColor) return;
    const url = pickImageForColor(images, selectedColor);
    if (!url) return;
    const i = slides.findIndex((s) => s.kind === "image" && s.url === url);
    if (i >= 0) setIndex(i);
  }, [selectedColor, images, slides]);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  function go(dir: -1 | 1) {
    setIndex((i) => (i + dir + slides.length) % slides.length);
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#ebe4db]">
        {current?.kind === "video" && playback ? (
          playback.kind === "file" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              key={playback.src}
              src={mediaSrc(playback.src)}
              controls
              playsInline
              autoPlay
              muted
              loop
              poster={videoPoster ? mediaSrc(videoPoster) : undefined}
              className="h-full w-full object-cover bg-black"
            />
          ) : (
            <iframe
              key={playback.src}
              src={playback.src.replace("autoplay=1", "autoplay=0")}
              title={`Vídeo de ${name}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0 bg-black"
            />
          )
        ) : current?.kind === "image" && current.url ? (
          <ProductImageZoom
            key={current.url}
            src={mediaSrc(current.url)}
            alt={current.alt || name}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            Sem imagem
          </div>
        )}
        {productId ? (
          <FavoriteHeartButton
            productId={productId}
            size="md"
            className="absolute right-3 top-3 z-20 h-10 w-10 rounded-full bg-white/90 shadow-sm backdrop-blur-[2px]"
          />
        ) : null}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Anterior"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 bg-white/90 p-2 shadow"
              onClick={() => go(-1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Próximo"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 bg-white/90 p-2 shadow"
              onClick={() => go(1)}
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>
      {slides.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {slides.map((slide, i) => (
            <button
              key={
                slide.kind === "video"
                  ? `video-${slide.url}`
                  : `${slide.url}-${i}`
              }
              type="button"
              onClick={() => setIndex(i)}
              aria-label={
                slide.kind === "video" ? `Vídeo de ${name}` : undefined
              }
              className={`relative aspect-square overflow-hidden border-2 ${
                i === index ? "border-ink" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaSrc(
                  slide.kind === "video" ? videoPoster || "" : slide.url
                )}
                alt={
                  slide.kind === "video"
                    ? `Vídeo de ${name}`
                    : slide.alt || name
                }
                className="h-full w-full object-cover bg-[#ebe4db]"
              />
              {slide.kind === "video" ? (
                <span
                  className="absolute inset-0 flex items-center justify-center bg-black/35"
                  aria-hidden
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-ink shadow">
                    <Play size={14} fill="currentColor" className="ml-0.5" />
                  </span>
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
