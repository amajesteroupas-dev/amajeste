"use client";

import { useEffect, useRef, useState } from "react";
import type { StoreStoryDTO, StoryQuestion } from "@/lib/stories";
import { StoriesPlayer } from "@/components/store/StoriesPlayer";
import { resolveVideoPlayback } from "@/lib/videos";
import { useLiveMiniPlayer } from "@/components/store/LiveMiniPlayerContext";

type Props = {
  stories: StoreStoryDTO[];
  surveyQuestions?: StoryQuestion[];
  /** Quando false, não mostra questionário no fim (global + por vídeo). */
  surveyEnabled?: boolean;
};

/** iOS Safari: #t=0.001 força o 1º frame; video dentro de <button> fica preto. */
function iosFriendlySrc(src: string) {
  if (!src) return src;
  if (src.includes("#")) return src;
  return `${src}#t=0.001`;
}

/** Bolinha global dos Stories — vídeo rolando; clique abre player estilo Instagram. */
export function LiveVideoFloat({
  stories,
  surveyQuestions = [],
  surveyEnabled = true,
}: Props) {
  const enabled = stories.length > 0;
  const [open, setOpen] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { session } = useLiveMiniPlayer();

  useEffect(() => {
    if (stories.length === 0) return;
    setPreviewIdx(0);
  }, [stories]);

  const showBubble = enabled && !open && !session;
  const preview = stories[previewIdx] || stories[0];
  const previewPlay = preview
    ? resolveVideoPlayback(preview.videoUrl)
    : null;
  const previewSrc =
    previewPlay?.kind === "file" ? previewPlay.src : null;
  const bubbleSrc = previewSrc ? iosFriendlySrc(previewSrc) : null;

  useEffect(() => {
    if (!showBubble || !bubbleSrc) return;
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    el.volume = 0;
    el.setAttribute("muted", "");
    el.setAttribute("playsinline", "true");
    el.setAttribute("webkit-playsinline", "true");
    el.playsInline = true;

    const tryPlay = () => {
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => undefined);
      }
    };

    tryPlay();
    el.addEventListener("loadedmetadata", tryPlay);
    el.addEventListener("loadeddata", tryPlay);
    el.addEventListener("canplay", tryPlay);

    // iOS: às vezes só toca após um toque na página — tenta de novo no 1º gesto
    const onGesture = () => tryPlay();
    document.addEventListener("touchstart", onGesture, {
      once: true,
      passive: true,
    });
    document.addEventListener("click", onGesture, { once: true });

    return () => {
      el.removeEventListener("loadedmetadata", tryPlay);
      el.removeEventListener("loadeddata", tryPlay);
      el.removeEventListener("canplay", tryPlay);
      document.removeEventListener("touchstart", onGesture);
      document.removeEventListener("click", onGesture);
    };
  }, [showBubble, bubbleSrc, previewIdx]);

  function skipBroken() {
    if (stories.length <= 1) return;
    setPreviewIdx((i) => (i + 1) % stories.length);
  }

  if (!enabled) return null;

  return (
    <>
      {showBubble ? (
        <div
          className="live-video-bubble"
          role="button"
          tabIndex={0}
          aria-label="Abrir stories Majesté"
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {bubbleSrc ? (
            <video
              ref={videoRef}
              key={bubbleSrc}
              className="live-video-bubble-video"
              autoPlay
              muted
              playsInline
              loop={stories.length <= 1}
              preload="auto"
              onEnded={() => {
                if (stories.length > 1) {
                  setPreviewIdx((i) => (i + 1) % stories.length);
                }
              }}
              onError={skipBroken}
            >
              <source src={bubbleSrc} type="video/mp4" />
            </video>
          ) : (
            <span className="live-video-bubble-fallback" aria-hidden />
          )}
          <span className="live-video-bubble-ring" aria-hidden />
        </div>
      ) : null}

      <StoriesPlayer
        stories={stories}
        surveyQuestions={surveyQuestions}
        surveyEnabled={surveyEnabled}
        open={open}
        onClose={() => setOpen(false)}
        initialIndex={previewIdx}
      />
    </>
  );
}
