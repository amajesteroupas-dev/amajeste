"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Video } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { BrandLogo } from "@/components/store/BrandLogo";
import { PaymentFlagsRow } from "@/components/store/PaymentFlags";
import { FavoriteHeartButton } from "@/components/store/FavoriteHeartButton";
import { ProductVideoModal } from "@/components/store/ProductVideoModal";
import { hasProductVideo } from "@/lib/videos";
import { colorToHex, normalizeColor, swatchBackground } from "@/lib/colors";
import { mediaSrc } from "@/lib/media-src";
import { useSitePromo } from "@/components/store/SitePromoContext";
import { promoPrice } from "@/lib/promotion-pricing";
import { fillPaymentCopy, resolveProductCardPromoLine } from "@/lib/payment-copy";

export type ProductCardColor = {
  name: string;
  hex?: string | null;
  imageUrl?: string | null;
};

type ProductCardProps = {
  productId: string;
  name: string;
  slug: string;
  price: number | string;
  imageUrl?: string | null;
  compareAt?: number | string | null;
  colorLabel?: string | null;
  hrefExtra?: string;
  colors?: ProductCardColor[];
  sizes?: string[];
  /** Só vídeo cadastrado neste produto (não da categoria). */
  videoUrl?: string | null;
  /** @deprecated Use o ícone flutuante para vídeos de categoria. */
  videoUrls?: string[];
};

export function ProductCard({
  productId,
  name,
  slug,
  price,
  imageUrl,
  compareAt,
  colorLabel,
  hrefExtra,
  colors = [],
  sizes = [],
  videoUrl,
}: ProductCardProps) {
  const sitePromo = useSitePromo();
  const uniqueColors = useMemo(() => {
    const seen = new Set<string>();
    const out: ProductCardColor[] = [];
    for (const c of colors) {
      const n = normalizeColor(c.name);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push({ ...c, name: n });
    }
    return out.slice(0, 8);
  }, [colors]);

  const uniqueSizes = useMemo(() => {
    const seen = new Set<string>();
    return sizes.filter((s) => {
      const k = s.trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [sizes]);

  const initial =
    (colorLabel && normalizeColor(colorLabel)) ||
    uniqueColors[0]?.name ||
    null;
  const [activeColor, setActiveColor] = useState<string | null>(initial);
  const [videoOpen, setVideoOpen] = useState(false);

  const activeMeta =
    uniqueColors.find((c) => c.name === activeColor) || uniqueColors[0];
  const displayImage =
    (activeColor
      ? uniqueColors.find((c) => c.name === activeColor)?.imageUrl
      : null) ||
    activeMeta?.imageUrl ||
    imageUrl ||
    null;

  const href = activeColor
    ? `/produto/${slug}?cor=${encodeURIComponent(activeColor)}`
    : hrefExtra
      ? `/produto/${slug}?${hrefExtra}`
      : `/produto/${slug}`;

  const pool = videoUrl && hasProductVideo(videoUrl) ? [videoUrl] : [];
  const showVideo = pool.length > 0;
  const listPrice = Number(price);
  const displayPercent = Math.max(
    sitePromo.active ? sitePromo.percent : 0,
    sitePromo.pixOfferPercent,
    sitePromo.card1xOfferPercent
  );
  const hasSitePromo = displayPercent > 0;
  const salePrice = hasSitePromo
    ? promoPrice(listPrice, displayPercent)
    : listPrice;
  const strikePrice =
    hasSitePromo
      ? listPrice
      : compareAt && Number(compareAt) > listPrice
        ? Number(compareAt)
        : null;

  const paymentLine =
    sitePromo.active && sitePromo.percent > 0
      ? resolveProductCardPromoLine(
          sitePromo.paymentCopy.productCardLinePromo,
          {
            percent: sitePromo.percent,
            pixPercent: sitePromo.pixPercentIncluded,
          }
        )
      : sitePromo.pixOfferPercent > 0 || sitePromo.card1xOfferPercent > 0
        ? [
            sitePromo.pixOfferPercent > 0
              ? `${sitePromo.pixOfferPercent}% no Pix`
              : null,
            sitePromo.card1xOfferPercent > 0
              ? `${sitePromo.card1xOfferPercent}% no cartão em 1x`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : fillPaymentCopy(sitePromo.paymentCopy.productCardLine, {
            percent: 5,
            pixPercent: 5,
          });

  return (
    <article className="product-card group flex h-full flex-col">
      <div className="product-card-media relative aspect-[3/4] w-full overflow-hidden bg-[#ece6df]">
        <Link href={href} className="absolute inset-0 block">
          {displayImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={displayImage}
              src={mediaSrc(displayImage)}
              alt={activeColor ? `${name} — ${activeColor}` : name}
              className="product-img absolute inset-0 h-full w-full object-cover object-top"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <BrandLogo size="sm" className="opacity-70" />
            </div>
          )}
        </Link>

        {showVideo ? (
          <button
            type="button"
            className="product-video-badge"
            aria-label={`Assistir vídeo de ${name}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setVideoOpen(true);
            }}
          >
            <span className="product-video-badge-icon" aria-hidden>
              <Video size={14} strokeWidth={2} />
            </span>
            <span className="product-video-badge-label">Ao Vivo</span>
          </button>
        ) : null}

        <div className="absolute right-0 top-0 z-[2] flex flex-col items-center gap-1.5 bg-white/75 px-2 py-2.5 backdrop-blur-[2px]">
          <FavoriteHeartButton productId={productId} size="sm" />
          {uniqueSizes.length > 0
            ? uniqueSizes.map((s) => (
                <span
                  key={s}
                  className="text-[10px] font-medium uppercase tracking-wide text-[#2a2420] leading-none pointer-events-none"
                >
                  {s}
                </span>
              ))
            : null}
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col text-center sm:text-left">
        <Link href={href} className="product-card-title">
          <h3 className="text-[11px] sm:text-xs uppercase tracking-[0.14em] text-[#2c2c2c] group-hover:text-[#a85f64] transition-colors font-medium">
            {name}
          </h3>
        </Link>
        <div className="mt-1.5 flex items-center justify-center sm:justify-start gap-2">
          <span className="text-sm font-semibold text-[#1a1a1a]">
            {formatBRL(salePrice)}
          </span>
          {strikePrice ? (
            <span className="text-muted line-through text-xs">
              {formatBRL(strikePrice)}
            </span>
          ) : null}
          {hasSitePromo ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#a85f64]">
              −{displayPercent}%
            </span>
          ) : null}
        </div>

        {/* Espaço fixo das cores — evita desalinhamento quando o produto tem só 1 cor */}
        <div className="mt-2 flex h-5 flex-wrap items-center justify-center gap-1.5 sm:justify-start">
          {uniqueColors.length > 1
            ? uniqueColors.map((c) => {
                const selected = c.name === activeColor;
                return (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveColor(c.name);
                    }}
                    className={`h-4 w-4 rounded-full border ${
                      selected
                        ? "border-[#1a1a1a] ring-1 ring-[#1a1a1a] ring-offset-1"
                        : "border-black/20"
                    }`}
                    style={{
                      background: swatchBackground(
                        c.hex || colorToHex(c.name, c.hex)
                      ),
                    }}
                  />
                );
              })
            : null}
        </div>

        {paymentLine ? (
          <p className="mt-2 text-[10px] sm:text-[11px] leading-snug text-[#6b5f56] text-center sm:text-left">
            {paymentLine}
          </p>
        ) : null}
        <PaymentFlagsRow
          variant="main"
          size="sm"
          className="mt-2 justify-center sm:justify-start"
        />

        <div className="mt-auto pt-4">
          <Link href={href} className="product-card-cta">
            Ver opções
          </Link>
        </div>
      </div>

      {showVideo ? (
        <ProductVideoModal
          videoUrls={pool}
          title={name}
          open={videoOpen}
          onClose={() => setVideoOpen(false)}
        />
      ) : null}
    </article>
  );
}
