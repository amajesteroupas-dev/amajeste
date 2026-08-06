"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, SkipForward, X } from "lucide-react";
import { pickRandomVideoUrl, resolveVideoPlayback } from "@/lib/videos";
import { useLiveMiniPlayer } from "@/components/store/LiveMiniPlayerContext";
import { ProductVideoModal } from "@/components/store/ProductVideoModal";

/** Mini player fixo — vídeo continua enquanto a pessoa navega. */
export function LiveMiniPlayer() {
  const { session, stopMini, updateCurrentUrl } = useLiveMiniPlayer();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const seekOnce = useRef(true);

  useEffect(() => {
    seekOnce.current = true;
  }, [session?.currentUrl, session?.currentTime]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (expanded) {
      el.pause();
    } else {
      void el.play().catch(() => undefined);
    }
  }, [expanded]);

  if (!session) return null;

  const playback = resolveVideoPlayback(session.currentUrl);
  if (!playback || playback.kind !== "file") {
    return null;
  }

  function next() {
    const nextUrl = pickRandomVideoUrl(session!.urls, session!.currentUrl);
    if (nextUrl) updateCurrentUrl(nextUrl);
  }

  return (
    <>
      <div
        className="live-mini-player"
        role="complementary"
        aria-label="Vídeo em reprodução"
        hidden={expanded}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          key={playback.src}
          src={playback.src}
          autoPlay
          playsInline
          controls
          className="live-mini-player-video"
          onLoadedMetadata={(e) => {
            if (!seekOnce.current) return;
            seekOnce.current = false;
            const t = session.currentTime || 0;
            if (t > 0) {
              try {
                e.currentTarget.currentTime = t;
              } catch {
                /* ignore */
              }
            }
          }}
          onEnded={() => {
            if (session.urls.length > 1) next();
            else stopMini();
          }}
        />
        <div className="live-mini-player-bar">
          <div className="live-mini-player-actions">
            {session.urls.length > 1 ? (
              <button
                type="button"
                aria-label="Próximo vídeo"
                className="live-mini-player-btn"
                onClick={next}
              >
                <SkipForward size={14} />
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Expandir vídeo"
              className="live-mini-player-btn"
              onClick={() => setExpanded(true)}
            >
              <Maximize2 size={14} />
            </button>
            <button
              type="button"
              aria-label="Fechar mini player"
              className="live-mini-player-btn"
              onClick={stopMini}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      <ProductVideoModal
        videoUrls={session.urls}
        title={session.title}
        open={expanded}
        onClose={() => setExpanded(false)}
        initialUrl={session.currentUrl}
      />
    </>
  );
}
