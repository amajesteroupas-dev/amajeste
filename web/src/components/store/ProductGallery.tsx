"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Video } from "lucide-react";
import { pickImageForColor } from "@/lib/colors";
import { mediaSrc } from "@/lib/media-src";
import { ProductImageZoom } from "@/components/store/ProductImageZoom";
import { FavoriteHeartButton } from "@/components/store/FavoriteHeartButton";
import { ProductVideoModal } from "@/components/store/ProductVideoModal";
import { hasProductVideo } from "@/lib/videos";

type Img = { url: string; alt: string | null };

type Props = {
  images: Img[];
  name: string;
  selectedColor?: string | null;
  productId?: string;
  /** Só vídeo deste produto — badge na foto. */
  videoUrl?: string | null;
  /** @deprecated Vídeos de categoria vão no ícone flutuante. */
  videoUrls?: string[];
};

export function ProductGallery({
  images,
  name,
  selectedColor,
  productId,
  videoUrl,
}: Props) {
  const list = images.length ? images : [{ url: "", alt: name }];
  const [index, setIndex] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);
  const current = list[index] || list[0];
  const pool = useMemo(
    () => (videoUrl && hasProductVideo(videoUrl) ? [videoUrl] : []),
    [videoUrl]
  );
  const showVideo = pool.length > 0;

  useEffect(() => {
    if (!selectedColor) return;
    const url = pickImageForColor(images, selectedColor);
    if (!url) return;
    const i = images.findIndex((img) => img.url === url);
    if (i >= 0) setIndex(i);
  }, [selectedColor, images]);

  function go(dir: -1 | 1) {
    setIndex((i) => (i + dir + list.length) % list.length);
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#ebe4db]">
        {current.url ? (
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
        {showVideo ? (
          <button
            type="button"
            className="product-video-badge"
            aria-label={`Assistir vídeo de ${name}`}
            onClick={() => setVideoOpen(true)}
          >
            <span className="product-video-badge-icon" aria-hidden>
              <Video size={16} strokeWidth={2} />
            </span>
            <span className="product-video-badge-label">Ao Vivo</span>
          </button>
        ) : null}
        {productId ? (
          <FavoriteHeartButton
            productId={productId}
            size="md"
            className="absolute right-3 top-3 z-20 h-10 w-10 rounded-full bg-white/90 shadow-sm backdrop-blur-[2px]"
          />
        ) : null}
        {list.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 bg-white/90 p-2 shadow"
              onClick={() => go(-1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Próxima foto"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 bg-white/90 p-2 shadow"
              onClick={() => go(1)}
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {list.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`aspect-square overflow-hidden border-2 ${
                i === index ? "border-ink" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaSrc(img.url)}
                alt={img.alt || name}
                className="h-full w-full object-cover bg-[#ebe4db]"
              />
            </button>
          ))}
        </div>
      )}
      {showVideo ? (
        <ProductVideoModal
          videoUrls={pool}
          title={name}
          open={videoOpen}
          onClose={() => setVideoOpen(false)}
        />
      ) : null}
    </div>
  );
}
