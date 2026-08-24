"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Tag } from "lucide-react";
import {
  cssFromCtaButton,
  cssFromLayer,
  getLayerStyle,
  layerInkOnPanel,
  parseTextStyle,
  renderLayerText,
  hasCustomRuns,
  type BannerTextStyle,
} from "@/lib/banner-text";
import { parseCutoutLayers, type CutoutLayer } from "@/lib/cutout-layout";
import { mediaSrc } from "@/lib/media-src";
import {
  artHasCopy,
  artLayersFromStyle,
  type BannerArtLayer,
} from "@/lib/banner-art";
import { BannerArtOverlay } from "@/components/store/BannerArtOverlay";
import {
  parseBannerVideos,
  parseVideoLayout,
  isCutoutVideoUrl,
  isAnimatedImageCutout,
  type BannerVideoClip,
  type BannerVideoLayout,
} from "@/lib/banner-videos";

export type StoreBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string;
  textAlign: string;
  overlay: number;
  layout?: string;
  bgColor?: string;
  panelColor?: string;
  highlight?: string | null;
  promoText?: string | null;
  couponCode?: string | null;
  tagline?: string | null;
  bannerSize?: string;
  imageFit?: string;
  focalX?: number;
  focalY?: number;
  imageZoom?: number;
  textStyle?: BannerTextStyle | null;
  cutoutImages?: CutoutLayer[] | string[] | null;
  videoUrl?: string | null;
  videoSeconds?: number | null;
  videoPlaylist?: BannerVideoClip[] | unknown;
  videoLayout?: BannerVideoLayout | string | null;
};

type Props = { banners: StoreBanner[] };

function mediaStyle(b: StoreBanner, mode: "studio" | "fill" = "fill"): CSSProperties {
  const x = b.focalX ?? 50;
  const y = b.focalY ?? (mode === "studio" ? 50 : 35);
  const zoom = b.imageZoom ?? 1;
  const fit =
    mode === "studio"
      ? b.imageFit === "contain"
        ? "contain"
        : "cover"
      : b.imageFit === "contain"
        ? "contain"
        : "cover";
  return {
    objectFit: fit,
    objectPosition:
      mode === "studio" && fit === "contain"
        ? `${x}% bottom`
        : `${x}% ${y}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${x}% ${y}%`,
  };
}

/** Pessoa inteira no painel retrato — never cover (corta cabeça/pernas). */
function videoClipStyle(clip: BannerVideoClip): CSSProperties {
  const cutout = clip.cutout || isCutoutVideoUrl(clip.url);
  return {
    objectFit: "contain",
    objectPosition: cutout ? "center bottom" : "center center",
    pointerEvents: "none",
    background: cutout ? "transparent" : "var(--banner-video-bg, #f0e8df)",
  };
}

function sizeClass(size?: string) {
  if (size === "compact") return "banner-frame--size-compact";
  if (size === "normal") return "banner-frame--size-normal";
  return "banner-frame--size-tall";
}

/** "20% OFF" em uma linha — tipografia vem do toolbar / trechos */
function HighlightBlock({
  value,
  layer,
  style,
}: {
  value: string;
  layer: ReturnType<typeof getLayerStyle>;
  style?: CSSProperties;
}) {
  if (hasCustomRuns(layer, value)) {
    return (
      <p className="banner-promo-highlight" style={style}>
        <span className="banner-promo-highlight-main">
          {renderLayerText(layer, value)}
        </span>
      </p>
    );
  }
  const m = value.trim().match(/^(\d+)\s*%\s*(off)?$/i);
  if (m) {
    return (
      <p className="banner-promo-highlight" style={style}>
        <span className="banner-promo-highlight-main">
          {m[1]}%
          {m[2] ? (
            <span className="banner-promo-highlight-off"> OFF</span>
          ) : null}
        </span>
      </p>
    );
  }
  return (
    <p className="banner-promo-highlight" style={style}>
      {value}
    </p>
  );
}

function bannerCtaHref(href: string | null | undefined) {
  const h = (href || "").trim();
  if (!h || h === "/" || h === "#") return "/categoria/conjunto-legging";
  return h;
}

function HeroVideoMedia({
  clip,
  banner,
  mediaKey,
  loop = true,
  onEnded,
  artLayers = [],
}: {
  clip: BannerVideoClip;
  banner: StoreBanner;
  mediaKey: string;
  loop?: boolean;
  onEnded?: () => void;
  artLayers?: BannerArtLayer[];
}) {
  const cutout = Boolean(clip.cutout || isCutoutVideoUrl(clip.url));
  return (
    <div className="banner-video-hero-media">
      {isAnimatedImageCutout(clip.url) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={mediaKey}
          src={clip.url}
          alt=""
          className={cutout ? "banner-video-cutout" : undefined}
          style={videoClipStyle(clip)}
        />
      ) : (
        <video
          key={mediaKey}
          src={clip.url}
          autoPlay
          muted
          loop={loop}
          playsInline
          poster={cutout ? undefined : banner.imageUrl || undefined}
          className={cutout ? "banner-video-cutout" : undefined}
          style={videoClipStyle(clip)}
          onEnded={onEnded}
        />
      )}
      {artLayers.length > 0 ? (
        <BannerArtOverlay layers={artLayers} />
      ) : null}
    </div>
  );
}

function Nav({
  count,
  index,
  setIndex,
}: {
  count: number;
  index: number;
  setIndex: (n: number | ((i: number) => number)) => void;
}) {
  if (count <= 1) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Anterior"
        className="banner-nav-btn banner-nav-btn--left"
        onClick={() => setIndex((i) => (i - 1 + count) % count)}
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        aria-label="Próximo"
        className="banner-nav-btn banner-nav-btn--right"
        onClick={() => setIndex((i) => (i + 1) % count)}
      >
        <ChevronRight size={18} />
      </button>
      <div className="banner-dots">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            className={`banner-dot ${i === index ? "is-active" : ""}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </>
  );
}

export function BannerCarousel({ banners }: Props) {
  const [index, setIndex] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);

  const currentPlaylist = parseBannerVideos(
    banners[index]?.videoPlaylist,
    banners[index]?.videoUrl,
    banners[index]?.videoSeconds
  );

  const currentBannerId = banners[index]?.id;

  useEffect(() => {
    setVideoIndex(0);
  }, [index, currentBannerId]);

  function advanceFromVideo(playlistLen: number) {
    if (playlistLen > 1 && videoIndex < playlistLen - 1) {
      setVideoIndex((v) => v + 1);
      return;
    }
    if (banners.length > 1) {
      setIndex((i) => (i + 1) % banners.length);
      return;
    }
    setVideoIndex(0);
  }

  useEffect(() => {
    if (!banners.length) return;
    const playlist = parseBannerVideos(
      banners[index]?.videoPlaylist,
      banners[index]?.videoUrl,
      banners[index]?.videoSeconds
    );
    const layoutMode = parseVideoLayout(banners[index]?.videoLayout);
    const pair = layoutMode === "pair" && playlist.length >= 2;

    if (playlist.length > 0) {
      if (pair) {
        const ms =
          Math.max(playlist[0].seconds, playlist[1].seconds, 3) * 1000;
        const t = setTimeout(() => {
          if (banners.length > 1) setIndex((i) => (i + 1) % banners.length);
        }, ms);
        return () => clearTimeout(t);
      }
      const clip = playlist[Math.min(videoIndex, playlist.length - 1)];
      const ms = Math.max(3000, (clip?.seconds || 8) * 1000);
      const t = setTimeout(() => advanceFromVideo(playlist.length), ms);
      return () => clearTimeout(t);
    }

    if (banners.length <= 1) return;
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 6500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners, index, videoIndex]);

  if (!banners.length) return null;

  const b = banners[index];
  const layout = b.layout || "studio";
  const playlist = currentPlaylist;
  const videoLayout = parseVideoLayout(b.videoLayout);
  const pairMode = videoLayout === "pair" && playlist.length >= 2;
  const activeClip =
    playlist[Math.min(videoIndex, Math.max(0, playlist.length - 1))] || null;
  const hasVideo = playlist.length > 0;
  const multiVideo = !pairMode && playlist.length > 1;
  const videoBg = b.bgColor || "#f0e8df";

  const ts = parseTextStyle(b.textStyle);
  const titleLayer = getLayerStyle(ts, "title");
  const subLayer = getLayerStyle(ts, "subtitle");
  const highlightLayer = getLayerStyle(ts, "highlight");
  const promoLayer = getLayerStyle(ts, "promo");
  const taglineLayer = getLayerStyle(ts, "tagline");
  const ctaLayer = getLayerStyle(ts, "cta");
  const titleCss = cssFromLayer(titleLayer);
  const subCss = cssFromLayer(subLayer);
  const highlightCss = cssFromLayer(highlightLayer);
  const promoCss = cssFromLayer(promoLayer);
  const taglineCss = cssFromLayer(taglineLayer);
  const ctaCss = cssFromCtaButton(ctaLayer);
  const align =
    b.textAlign === "center"
      ? "items-center text-center"
      : b.textAlign === "right"
        ? "items-end text-right"
        : "items-start text-left";

  const titleOnCream = layerInkOnPanel(titleLayer, "#5c4336");
  const subOnCream = layerInkOnPanel(subLayer, "#5c534c");
  const highlightOnCream = layerInkOnPanel(highlightLayer, "#a85f64");
  const promoOnCream = layerInkOnPanel(promoLayer, "#5c534c");
  const taglineOnCream = layerInkOnPanel(taglineLayer, "#8a7468");
  const videoArt = artLayersFromStyle(ts);
  const hideCreamText = artHasCopy(videoArt);

  const heroCopy = (
    <div className="banner-video-hero-copy">
      {!hideCreamText && b.tagline?.trim() ? (
        <p className="hero-kicker" style={cssFromLayer(taglineOnCream)}>
          {renderLayerText(taglineOnCream, b.tagline)}
        </p>
      ) : null}
      {!hideCreamText && b.highlight?.trim() ? (
        <p style={cssFromLayer(highlightOnCream)}>
          {renderLayerText(highlightOnCream, b.highlight)}
        </p>
      ) : null}
      {!hideCreamText && b.title?.trim() ? (
        <h2 className="banner-studio-title" style={cssFromLayer(titleOnCream)}>
          {renderLayerText(titleOnCream, b.title)}
        </h2>
      ) : null}
      {!hideCreamText && b.subtitle?.trim() ? (
        <p className="banner-studio-sub" style={cssFromLayer(subOnCream)}>
          {renderLayerText(subOnCream, b.subtitle)}
        </p>
      ) : null}
      {!hideCreamText && b.promoText?.trim() ? (
        <p className="banner-studio-sub" style={cssFromLayer(promoOnCream)}>
          {renderLayerText(promoOnCream, b.promoText)}
        </p>
      ) : null}
      {b.ctaLabel ? (
        <div className="banner-studio-cta" data-no-pan>
          <Link
            href={bannerCtaHref(b.ctaHref)}
            className="banner-cta-btn"
            style={ctaCss}
          >
            {renderLayerText(ctaLayer, b.ctaLabel)}
          </Link>
        </div>
      ) : null}
    </div>
  );

  const cleanVideoStage =
    hasVideo && layout !== "promo" ? (
      <div
        className={`banner-video-hero${pairMode ? " is-pair" : ""}${
          hideCreamText && !b.ctaLabel ? " is-art-only" : ""
        }`}
        style={{
          background: videoBg,
          ["--banner-video-bg" as string]: videoBg,
        }}
      >
        {pairMode ? (
          <>
            <HeroVideoMedia
              clip={playlist[0]}
              banner={b}
              mediaKey={`${b.id}-pair-0-${playlist[0].url}`}
              artLayers={videoArt}
            />
            {hideCreamText && !b.ctaLabel ? null : heroCopy}
            <HeroVideoMedia
              clip={playlist[1]}
              banner={b}
              mediaKey={`${b.id}-pair-1-${playlist[1].url}`}
            />
          </>
        ) : activeClip ? (
          <>
            {hideCreamText && !b.ctaLabel ? null : heroCopy}
            <HeroVideoMedia
              clip={activeClip}
              banner={b}
              mediaKey={`${b.id}-v-${videoIndex}-${activeClip.url}`}
              loop={!multiVideo}
              artLayers={videoArt}
              onEnded={() => {
                if (multiVideo) advanceFromVideo(playlist.length);
              }}
            />
          </>
        ) : null}
      </div>
    ) : null;

  const videoEl =
    hasVideo && activeClip && layout === "promo" ? (
      <video
        key={`${b.id}-v-${videoIndex}-${activeClip.url}`}
        className="banner-promo-video"
        src={activeClip.url}
        autoPlay
        muted
        loop={!multiVideo}
        playsInline
        poster={b.imageUrl || undefined}
        style={videoClipStyle(activeClip)}
        onEnded={() => {
          if (multiVideo) advanceFromVideo(playlist.length);
        }}
      />
    ) : null;

  const frameClass =
    layout === "promo"
      ? "banner-frame--promo"
      : layout === "overlay"
        ? "banner-frame--overlay"
        : layout === "fullbleed"
          ? "banner-frame--fullbleed"
          : layout === "cutouts"
            ? "banner-frame--cutouts"
            : "banner-frame--studio";

  return (
    <section className="banner-carousel">
      <div
        className={`banner-frame ${frameClass} ${sizeClass(b.bannerSize)}${
          hasVideo ? " has-video" : ""
        }`}
        style={
          hasVideo && layout !== "promo"
            ? {
                background: videoBg,
                ["--banner-video-bg" as string]: videoBg,
              }
            : layout === "studio"
              ? { background: b.bgColor || "#f0e8df" }
              : layout === "promo"
                ? { background: b.panelColor || b.bgColor || "#ebe3d8" }
                : layout === "fullbleed"
                  ? {
                      background:
                        b.imageFit === "contain"
                          ? b.panelColor || b.bgColor || "#ebe3d8"
                          : "#2a2420",
                    }
                  : layout === "cutouts"
                    ? { background: b.bgColor || "#f0e8df" }
                    : undefined
        }
      >
        {cleanVideoStage}
        {layout === "promo" && (
          <div className="banner-promo-grid">
            <div
              className="banner-promo-panel"
              style={{
                background: b.panelColor || b.bgColor || "#ebe3d8",
                ["--promo-panel" as string]:
                  b.panelColor || b.bgColor || "#ebe3d8",
              }}
            >
              {b.highlight && (
                <HighlightBlock
                  value={b.highlight}
                  layer={highlightLayer}
                  style={highlightCss}
                />
              )}
              {b.title?.trim() ? (
                <p className="banner-promo-kicker" style={titleCss}>
                  {renderLayerText(titleLayer, b.title)}
                </p>
              ) : null}
              {b.subtitle && (
                <p className="banner-promo-sub" style={subCss}>
                  {renderLayerText(subLayer, b.subtitle)}
                </p>
              )}
              {(b.highlight ||
                b.title?.trim() ||
                b.subtitle ||
                b.promoText ||
                b.tagline ||
                b.couponCode) && <div className="banner-promo-rule" />}
              {b.promoText && (
                <p className="banner-promo-text" style={promoCss}>
                  {renderLayerText(promoLayer, b.promoText)}
                </p>
              )}
              {b.tagline && (
                <p className="banner-promo-tagline" style={taglineCss}>
                  {renderLayerText(taglineLayer, b.tagline)}
                </p>
              )}
              {b.couponCode && (
                <div
                  className="banner-promo-coupon"
                  style={{
                    color: getLayerStyle(ts, "title").color || "#5c4336",
                    borderColor: "rgba(92,67,54,0.4)",
                  }}
                >
                  <Tag size={14} />
                  {b.couponCode}
                </div>
              )}
              {b.ctaLabel && (
                <div className="banner-promo-cta" data-no-pan>
                  <Link
                    href={bannerCtaHref(b.ctaHref)}
                    className="banner-cta-btn"
                    style={ctaCss}
                  >
                    {renderLayerText(ctaLayer, b.ctaLabel)}
                  </Link>
                </div>
              )}
            </div>
            <div className="banner-promo-media">
              {videoEl ? (
                videoEl
              ) : b.imageUrl?.trim() || b.cutoutImages?.length ? (
                (() => {
                  const duo = parseCutoutLayers(
                    b.cutoutImages?.length
                      ? b.cutoutImages
                      : [{ url: b.imageUrl, x: 50, y: 0, scale: 1 }]
                  ).slice(0, 2);
                  if (duo.length >= 2) {
                    return (
                      <div className="banner-promo-duo">
                        {duo.map((layer, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={`${b.id}-duo-${i}`}
                            src={mediaSrc(layer.url)}
                            alt=""
                            style={{
                              objectPosition: `${layer.x ?? 50}% ${
                                i === 0 ? 22 : 18
                              }%`,
                            }}
                          />
                        ))}
                      </div>
                    );
                  }
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaSrc(b.imageUrl)}
                      alt=""
                      style={mediaStyle(
                        { ...b, imageFit: "cover", focalY: b.focalY ?? 20 },
                        "fill"
                      )}
                    />
                  );
                })()
              ) : null}
            </div>
          </div>
        )}

        {layout === "overlay" && !cleanVideoStage && (
          <>
            {videoEl ? (
              videoEl
            ) : (
              banners.map((item, i) =>
                item.imageUrl?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={item.id}
                    src={item.imageUrl}
                    alt=""
                    className={`banner-fullbleed-img transition-opacity duration-700 ${
                      i === index ? "opacity-100" : "opacity-0"
                    }`}
                    style={mediaStyle(item)}
                  />
                ) : null
              )
            )}
            <div className="banner-overlay-fade" />
            <div className="banner-overlay-copy">
              {b.title?.trim() ? (
                <h1 className="banner-overlay-title" style={titleCss}>
                  {renderLayerText(titleLayer, b.title)}
                </h1>
              ) : null}
              {b.subtitle?.trim() ? (
                <p className="banner-overlay-promo" style={subCss}>
                  {renderLayerText(subLayer, b.subtitle)}
                </p>
              ) : null}
              {b.promoText?.trim() ? (
                <p className="banner-overlay-promo" style={promoCss}>
                  {renderLayerText(promoLayer, b.promoText)}
                </p>
              ) : null}
              {b.ctaLabel && (
                <div className="mt-4">
                  <Link
                    href={bannerCtaHref(b.ctaHref)}
                    className="banner-cta-btn"
                    style={ctaCss}
                  >
                    {renderLayerText(ctaLayer, b.ctaLabel)}
                  </Link>
                </div>
              )}
            </div>
            {b.tagline && (
              <p className="banner-overlay-tagline" style={taglineCss}>
                {renderLayerText(taglineLayer, b.tagline)}
              </p>
            )}
          </>
        )}

        {(layout === "studio" || layout === "cutouts") && !cleanVideoStage && (
          <>
            <div
              className="banner-studio-bg"
              aria-hidden
              style={
                b.bgColor
                  ? {
                      background: `
                        radial-gradient(ellipse 55% 90% at 18% 110%, rgba(214, 196, 176, 0.45) 0%, transparent 70%),
                        radial-gradient(ellipse 50% 85% at 72% 115%, rgba(210, 190, 168, 0.4) 0%, transparent 68%),
                        linear-gradient(180deg, ${b.bgColor} 0%, ${b.bgColor} 100%)
                      `,
                    }
                  : undefined
              }
            />
            <div className="banner-brand-watermark" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo.svg" alt="" />
            </div>
            <div className="banner-studio-grid h-full">
              <div className={`banner-studio-copy ${align}`}>
                {b.tagline && (
                  <p className="hero-kicker mb-2" style={taglineCss}>
                    {renderLayerText(taglineLayer, b.tagline)}
                  </p>
                )}
                {b.title?.trim() ? (
                  <h1
                    className="banner-studio-title animate-[rise_0.7s_ease_both]"
                    style={titleCss}
                  >
                    {renderLayerText(titleLayer, b.title)}
                  </h1>
                ) : null}
                {b.highlight && (
                  <p className="mt-2" style={highlightCss}>
                    {renderLayerText(highlightLayer, b.highlight)}
                  </p>
                )}
                {b.subtitle?.trim() ? (
                  <p className="banner-studio-sub" style={subCss}>
                    {renderLayerText(subLayer, b.subtitle)}
                  </p>
                ) : null}
                {b.promoText?.trim() ? (
                  <p className="banner-studio-sub" style={promoCss}>
                    {renderLayerText(promoLayer, b.promoText)}
                  </p>
                ) : null}
                {b.couponCode && (
                  <div
                    className="banner-promo-coupon mt-3"
                    style={{
                      color: getLayerStyle(ts, "title").color || "#5c4336",
                      borderColor: "rgba(92,67,54,0.45)",
                    }}
                  >
                    <Tag size={14} />
                    {b.couponCode}
                  </div>
                )}
                {b.ctaLabel && (
                  <div className="banner-studio-cta" data-no-pan>
                    <Link
                      href={bannerCtaHref(b.ctaHref)}
                      className="banner-cta-btn"
                      style={ctaCss}
                    >
                      {renderLayerText(ctaLayer, b.ctaLabel)}
                    </Link>
                  </div>
                )}
              </div>
              <div
                className={
                  layout === "cutouts"
                    ? "banner-cutouts-media"
                    : "banner-studio-media"
                }
              >
                {videoEl && (layout === "studio" || layout === "cutouts") ? (
                  <div
                    className={
                      layout === "cutouts"
                        ? "banner-cutouts-media"
                        : "banner-studio-media"
                    }
                  >
                    {videoEl}
                  </div>
                ) : layout === "cutouts" ? (
                    <div className="banner-cutouts-stage">
                      {(
                        parseCutoutLayers(
                          b.cutoutImages?.length
                            ? b.cutoutImages
                            : [{ url: b.imageUrl, x: 50, y: 0, scale: 1 }]
                        )
                      ).map((layer, i) => (
                        <div
                          key={`${b.id}-c-${i}`}
                          className="banner-cutout-layer"
                          style={{
                            left: `${layer.x}%`,
                            bottom: `${layer.y}%`,
                            zIndex: i + 1,
                            transform: `translateX(-50%) scale(${
                              layer.scale * (b.imageZoom ?? 1)
                            })`,
                            pointerEvents: "none",
                            cursor: "default",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mediaSrc(layer.url)}
                            alt=""
                            className="banner-cutout-figure"
                          />
                        </div>
                      ))}
                    </div>
                ) : (
                  banners
                    .filter(
                      (item) =>
                        (item.id === b.id ||
                          (item.layout || "studio") === "studio") &&
                        Boolean(item.imageUrl?.trim())
                    )
                    .map((item) => {
                      const useCutout = item.imageFit === "contain";
                      const i = banners.findIndex((x) => x.id === item.id);
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={item.id}
                          src={mediaSrc(item.imageUrl)}
                          alt=""
                          className={`transition-opacity duration-700 ${
                            i === index ? "opacity-100" : "opacity-0"
                          } ${useCutout ? "is-cutout" : "is-cover"}`}
                          style={mediaStyle(
                            {
                              ...item,
                              imageFit: useCutout ? "contain" : "cover",
                              focalY: item.focalY ?? (useCutout ? 100 : 28),
                            },
                            "studio"
                          )}
                        />
                      );
                    })
                )}
              </div>
            </div>
          </>
        )}

        {layout === "fullbleed" && !cleanVideoStage && (
          <>
            {videoEl ? (
              videoEl
            ) : (
              banners.map((item, i) => {
                if ((item.layout || "studio") !== "fullbleed" && i !== index) {
                  return null;
                }
                const fitContain = item.imageFit === "contain";
                const active = i === index;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={item.id}
                    src={item.imageUrl}
                    alt=""
                    className={`banner-fullbleed-img transition-opacity duration-700 ${
                      active ? "opacity-100" : "opacity-0"
                    } ${fitContain ? "is-contain" : "is-cover"}`}
                    style={{
                      ...mediaStyle(
                        {
                          ...item,
                          focalY: item.focalY ?? 38,
                        },
                        "fill"
                      ),
                      visibility: active ? "visible" : "hidden",
                    }}
                  />
                );
              })
            )}
            {(() => {
              const overlayAmt = Number(b.overlay);
              const amount = Number.isFinite(overlayAmt)
                ? Math.max(0, overlayAmt)
                : 0.28;
              if (amount <= 0.01) return null;
              return (
                <div
                  className="absolute inset-0 pointer-events-none z-[1]"
                  style={{ background: `rgba(20,14,10,${amount})` }}
                />
              );
            })()}
            {(() => {
              const hasCopy = Boolean(
                b.tagline?.trim() ||
                  b.title?.trim() ||
                  b.highlight?.trim() ||
                  b.promoText?.trim() ||
                  b.subtitle?.trim() ||
                  b.couponCode?.trim() ||
                  (b.ctaLabel && b.ctaHref)
              );
              if (!hasCopy) return null;
              const artLed =
                b.imageFit === "contain" || Number(b.overlay) <= 0.08;
              return (
                <div
                  className={`banner-fullbleed-copy container-maj ${align}${
                    artLed ? " banner-fullbleed-copy--art" : ""
                  }`}
                >
                  {b.tagline && (
                    <p
                      className="hero-kicker mb-2"
                      style={{ ...taglineCss, color: "#f4efe8" }}
                    >
                      {renderLayerText(taglineLayer, b.tagline)}
                    </p>
                  )}
                  {b.title?.trim() ? (
                    <h1
                      className="banner-fullbleed-title animate-[rise_0.7s_ease_both]"
                      style={{
                        ...titleCss,
                        color: "#fff",
                        textShadow: "0 2px 18px rgba(0,0,0,0.3)",
                      }}
                    >
                      {renderLayerText(titleLayer, b.title)}
                    </h1>
                  ) : null}
                  {b.highlight && (
                    <p className="mt-2 text-white/95" style={highlightCss}>
                      {renderLayerText(highlightLayer, b.highlight)}
                    </p>
                  )}
                  {b.subtitle?.trim() ? (
                    <p
                      className="mt-3 max-w-md text-[0.98rem] leading-relaxed"
                      style={{
                        ...subCss,
                        color: subCss.color || "rgba(255,255,255,0.92)",
                      }}
                    >
                      {renderLayerText(subLayer, b.subtitle)}
                    </p>
                  ) : null}
                  {b.promoText?.trim() ? (
                    <p
                      className="mt-2 max-w-md text-[0.98rem] leading-relaxed"
                      style={{
                        ...promoCss,
                        color: promoCss.color || "rgba(255,255,255,0.92)",
                      }}
                    >
                      {renderLayerText(promoLayer, b.promoText)}
                    </p>
                  ) : null}
                  {b.couponCode && (
                    <div className="banner-promo-coupon mt-3">
                      <Tag size={14} />
                      {b.couponCode}
                    </div>
                  )}
                  {b.ctaLabel && (
                    <div className="mt-6">
                      <Link
                        href={bannerCtaHref(b.ctaHref)}
                        className="banner-cta-btn"
                        style={ctaCss}
                      >
                        {renderLayerText(ctaLayer, b.ctaLabel)}
                      </Link>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}

        <Nav count={banners.length} index={index} setIndex={setIndex} />
      </div>
    </section>
  );
}
