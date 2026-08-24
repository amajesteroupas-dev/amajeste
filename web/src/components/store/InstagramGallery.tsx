"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Play, X } from "lucide-react";
import { embedUrlFromPermalink } from "@/lib/instagram";
import { cn } from "@/lib/utils";

export type GalleryPost = {
  id: string;
  permalink: string;
  shortcode: string;
  mediaType: string;
  caption: string | null;
  coverUrl: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
};

type Filter = "all" | "IMAGE" | "VIDEO";

function coverOf(p: GalleryPost) {
  return p.coverUrl || p.thumbnailUrl || p.mediaUrl;
}

function isVideo(p: GalleryPost) {
  return p.mediaType === "VIDEO";
}

function typeLabel(p: GalleryPost) {
  if (isVideo(p)) return "Reel";
  if (p.mediaType === "CAROUSEL") return "Carrossel";
  return "Foto";
}

/** Coroa dourada oficial — marca na moldura */
function FrameCrown({
  className,
  gradId,
}: {
  className?: string;
  gradId: string;
}) {
  return (
    <svg className={className} viewBox="0 0 100 72" fill="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="8" y1="4" x2="92" y2="68">
          <stop offset="0%" stopColor="#f3e4b0" />
          <stop offset="45%" stopColor="#d8b45e" />
          <stop offset="100%" stopColor="#8a6a28" />
        </linearGradient>
      </defs>
      <path
        d="M14 58 H86"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M22 56 L30 18 L42 40"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M78 56 L70 18 L58 40"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M50 10 L62 34 L50 54 L38 34 Z"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M30 18 L50 54 L70 18"
        stroke={`url(#${gradId})`}
        strokeWidth="1.55"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.92"
      />
      <circle cx="30" cy="16.5" r="3.4" fill={`url(#${gradId})`} />
      <circle cx="50" cy="8.5" r="3.8" fill={`url(#${gradId})`} />
      <circle cx="70" cy="16.5" r="3.4" fill={`url(#${gradId})`} />
    </svg>
  );
}

function BrandedFrame({
  children,
  label,
  isReel,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  label: string;
  isReel: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  const uid = useId().replace(/:/g, "");
  return (
    <button
      type="button"
      onClick={onClick}
      className="ig-frame group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24a] focus-visible:ring-offset-2"
      aria-label={ariaLabel}
    >
      <span className="ig-frame-outer">
        <span className="ig-frame-inner">
          <span className="ig-frame-media">{children}</span>
          <span className="ig-frame-shade" />
          {isReel ? (
            <span className="ig-frame-play" aria-hidden>
              <span className="ig-frame-play-btn">
                <Play size={15} fill="currentColor" className="ml-0.5" />
              </span>
            </span>
          ) : null}
          <span className="ig-frame-badge">{label}</span>
        </span>
        <span className="ig-frame-mark" aria-hidden>
          <FrameCrown className="ig-frame-crown" gradId={`igc-${uid}`} />
          <span className="ig-frame-word">Majesté</span>
        </span>
        <span className="ig-frame-corner ig-frame-corner--tl" aria-hidden />
        <span className="ig-frame-corner ig-frame-corner--tr" aria-hidden />
        <span className="ig-frame-corner ig-frame-corner--bl" aria-hidden />
        <span className="ig-frame-corner ig-frame-corner--br" aria-hidden />
      </span>
    </button>
  );
}

export function InstagramGallery({ posts }: { posts: GalleryPost[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState<GalleryPost | null>(null);
  const modalGrad = useId().replace(/:/g, "");

  const filtered = useMemo(() => {
    if (filter === "all") return posts;
    if (filter === "VIDEO") {
      return posts.filter((p) => p.mediaType === "VIDEO");
    }
    return posts.filter(
      (p) => p.mediaType === "IMAGE" || p.mediaType === "CAROUSEL"
    );
  }, [filter, posts]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  useEffect(() => {
    document.body.style.overflow = active ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [active]);

  const activeEmbed = active ? embedUrlFromPermalink(active.permalink) : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <p
            className="text-xl md:text-2xl text-[#2a2420]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Feed Majesté
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Tudo"],
              ["IMAGE", "Fotos"],
              ["VIDEO", "Vídeos"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "px-4 py-2 text-xs uppercase tracking-[0.14em] border transition-colors",
                filter === key
                  ? "bg-[#2a2420] text-[#f4efe8] border-[#2a2420]"
                  : "bg-transparent text-[#5c534c] border-[#2a2420]/20 hover:border-[#c9a24a]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-[#5c534c] text-sm">
          Nenhum conteúdo neste filtro ainda.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {filtered.map((p) => {
            const embed = embedUrlFromPermalink(p.permalink);
            const src = coverOf(p);
            if (!embed && !src) return null;

            return (
              <BrandedFrame
                key={p.id}
                label={typeLabel(p)}
                isReel={isVideo(p)}
                onClick={() => setActive(p)}
                ariaLabel={`Abrir ${typeLabel(p)} ${p.shortcode}`}
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={p.caption?.slice(0, 80) || "Post Instagram Majesté"}
                    className="ig-frame-img"
                    loading="lazy"
                  />
                ) : embed ? (
                  <div className="ig-frame-embed" aria-hidden>
                    <iframe
                      title=""
                      src={embed}
                      tabIndex={-1}
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                ) : null}
              </BrandedFrame>
            );
          })}
        </div>
      )}

      {active && activeEmbed ? (
        <div
          className="fixed inset-0 z-[80] bg-[#1a1410]/88 flex items-center justify-center p-3 md:p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            aria-label="Fechar"
            onClick={() => setActive(null)}
          >
            <X size={28} />
          </button>
          <div
            className="ig-modal-frame w-full max-w-[420px] max-h-[92vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ig-modal-mark" aria-hidden>
              <FrameCrown className="h-5 w-auto" gradId={`igm-${modalGrad}`} />
              <span>Majesté</span>
            </div>
            <iframe
              title={typeLabel(active)}
              src={activeEmbed}
              className="w-full border-0 block bg-[#1c1814]"
              style={{ height: "min(70vh, 640px)" }}
              allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
            />
            {active.caption ? (
              <p className="p-3 text-sm text-[#5c534c] leading-relaxed line-clamp-4 bg-[#faf7f3]">
                {active.caption}
              </p>
            ) : null}
            <div className="px-3 pb-3 bg-[#faf7f3]">
              <a
                href={active.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs uppercase tracking-[0.14em] text-[#8a7468] hover:text-[#2a2420]"
              >
                Abrir no Instagram →
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
