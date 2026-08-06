"use client";

import { useEffect, useRef, useState } from "react";
import { PictureInPicture2, SkipForward, X } from "lucide-react";
import { pickRandomVideoUrl, resolveVideoPlayback } from "@/lib/videos";
import { useLiveMiniPlayer } from "@/components/store/LiveMiniPlayerContext";

type Props = {
  videoUrls: string[];
  title?: string;
  open: boolean;
  onClose: () => void;
  /** Continua neste URL ao expandir o mini player. */
  initialUrl?: string | null;
};

/** Caixa quadrada (estilo YouTube Shorts / player 1:1). */
function squareBox() {
  if (typeof window === "undefined") return { side: 420 };
  const side = Math.min(
    window.innerWidth * 0.92,
    window.innerHeight * 0.82,
    520
  );
  return { side: Math.round(side) };
}

export function ProductVideoModal({
  videoUrls,
  title,
  open,
  onClose,
  initialUrl,
}: Props) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [side, setSide] = useState(420);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const urlsKey = videoUrls.join("|");
  const { startMini } = useLiveMiniPlayer();

  useEffect(() => {
    if (!open) {
      setCurrentUrl(null);
      return;
    }
    const pick =
      (initialUrl && videoUrls.includes(initialUrl) && initialUrl) ||
      pickRandomVideoUrl(videoUrls);
    setCurrentUrl(pick);
    setSide(squareBox().side);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, urlsKey, initialUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    function onResize() {
      setSide(squareBox().side);
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const playback = currentUrl ? resolveVideoPlayback(currentUrl) : null;
  if (!open || !playback) return null;

  const playbackKind = playback.kind;
  const playbackSrc = playback.src;

  function nextRandom() {
    setCurrentUrl((prev) => pickRandomVideoUrl(videoUrls, prev));
  }

  function continueOnSite() {
    if (!currentUrl || playbackKind !== "file") {
      onClose();
      return;
    }
    const t = videoRef.current?.currentTime || 0;
    startMini({
      urls: videoUrls,
      currentUrl,
      title,
      currentTime: t,
    });
    onClose();
  }

  const canMini = playbackKind === "file";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Vídeo — ${title}` : "Vídeo do produto"}
      onClick={onClose}
    >
      <div
        className="relative overflow-hidden bg-transparent shadow-2xl"
        style={{
          width: side,
          height: side,
          maxWidth: "92vw",
          maxHeight: "82vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute right-2 top-2 z-10 flex gap-2">
          {canMini ? (
            <button
              type="button"
              aria-label="Continuar navegando com o vídeo"
              title="Continuar no site com o vídeo em mini"
              onClick={continueOnSite}
              className="flex h-9 items-center gap-1.5 rounded-full bg-black/60 px-3 text-xs font-medium text-white hover:bg-black/80"
            >
              <PictureInPicture2 size={15} />
              <span className="hidden sm:inline">Continuar no site</span>
            </button>
          ) : null}
          {videoUrls.length > 1 ? (
            <button
              type="button"
              aria-label="Próximo vídeo"
              onClick={nextRandom}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <SkipForward size={16} />
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Fechar vídeo"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X size={18} />
          </button>
        </div>

        {playbackKind === "file" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            ref={videoRef}
            key={playbackSrc}
            src={playbackSrc}
            controls
            autoPlay
            playsInline
            className="h-full w-full object-cover bg-transparent"
            onEnded={() => {
              if (videoUrls.length > 1) nextRandom();
            }}
          />
        ) : (
          <iframe
            key={playbackSrc}
            src={playbackSrc}
            title={title || "Vídeo"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        )}
      </div>
    </div>
  );
}
