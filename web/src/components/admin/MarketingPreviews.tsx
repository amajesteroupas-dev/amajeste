"use client";

import { BrandLogo } from "@/components/store/BrandLogo";
import { absoluteSiteUrl } from "@/lib/marketing-download";

export type IgFormat = "IG_FEED" | "IG_PORTRAIT" | "IG_STORY" | "IG_REELS";

export const IG_FORMATS: {
  id: IgFormat;
  label: string;
  size: string;
  w: number;
  h: number;
  tip: string;
}[] = [
  {
    id: "IG_FEED",
    label: "Feed quadrado",
    size: "1080 × 1080",
    w: 1080,
    h: 1080,
    tip: "Post clássico do feed. Ideal para look completo e promoção.",
  },
  {
    id: "IG_PORTRAIT",
    label: "Feed vertical",
    size: "1080 × 1350",
    w: 1080,
    h: 1350,
    tip: "Formato vertical do feed (4:5). Ocupa mais a tela no celular.",
  },
  {
    id: "IG_STORY",
    label: "Stories",
    size: "1080 × 1920",
    w: 1080,
    h: 1920,
    tip: "Stories 9:16. No app, adicione o sticker de link com o texto do botão.",
  },
  {
    id: "IG_REELS",
    label: "Reels / capa",
    size: "1080 × 1920",
    w: 1080,
    h: 1920,
    tip: "Mesmo tamanho do Stories (9:16). Bom para capa ou frame do Reels.",
  },
];

export function EmailCampaignPreview({
  title,
  body,
  imageUrl,
  ctaLabel,
}: {
  title: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref?: string;
}) {
  const paragraphs = (body || "Novidades, lançamentos e condições especiais da Majesté.")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="rounded-sm border border-[#e8e0d6] bg-[#f4f1ec] p-3 sm:p-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#6b5f56] mb-2 text-center">
        Prévia do e-mail · como o cliente recebe
      </p>
      <div className="mx-auto max-w-[360px] bg-white border border-[#e8e0d6] overflow-hidden shadow-sm">
        <div className="px-5 pt-6 pb-3 text-center">
          <p
            className="text-[1.35rem] leading-none"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              background:
                "linear-gradient(180deg, #e8d090 0%, #c9a24a 45%, #8f6f2c 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Majesté
          </p>
          <p className="mt-1 text-[9px] font-semibold tracking-[0.35em] text-[#a8842f]">
            FITNESS
          </p>
        </div>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="w-full aspect-[4/5] object-cover object-top"
          />
        ) : (
          <div className="mx-3 mb-2 flex aspect-[4/5] items-center justify-center bg-[#f4f1ec] text-xs text-[#9a8f86]">
            Sua imagem aparece aqui
          </div>
        )}
        <div className="px-5 py-4 space-y-2">
          <h3
            className="text-lg text-[#2a2420] leading-snug"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {title || "Título da campanha"}
          </h3>
          {paragraphs.map((p) => (
            <p key={p} className="text-[13px] leading-relaxed text-[#5c534c]">
              {p}
            </p>
          ))}
          {ctaLabel ? (
            <div className="pt-2 pb-1 text-center">
              <span className="inline-block bg-[#a85f64] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                {ctaLabel}
              </span>
            </div>
          ) : null}
        </div>
        <div className="border-t border-[#eee6dc] px-5 py-3 text-center text-[10px] text-[#9a8f86]">
          Você recebeu este e-mail porque se cadastrou na Majesté.
        </div>
      </div>
    </div>
  );
}

export function InstagramArtPreview({
  format,
  title,
  body,
  imageUrl,
  ctaLabel,
  ctaHref,
  hashtags,
  showLogo = false,
}: {
  format: IgFormat;
  title: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref?: string;
  hashtags: string;
  showLogo?: boolean;
}) {
  const meta = IG_FORMATS.find((f) => f.id === format) || IG_FORMATS[0];
  const isStory = format === "IG_STORY" || format === "IG_REELS";
  const maxH = isStory ? 420 : format === "IG_PORTRAIT" ? 340 : 280;
  const ratio = meta.w / meta.h;
  const link = absoluteSiteUrl(ctaHref || "/");

  return (
    <div className="rounded-sm border border-[#e8e0d6] bg-[#1a1a1a] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] uppercase tracking-[0.14em] text-[#cfc6bc]">
          Prévia {meta.label}
        </p>
        <p className="text-[10px] tabular-nums text-[#8a827a]">{meta.size} px</p>
      </div>
      <div className="flex justify-center">
        <div
          className="relative overflow-hidden bg-[#2a2420] shadow-xl ring-1 ring-white/10"
          style={{
            width: Math.min(260, maxH * ratio),
            height: Math.min(maxH, 260 / ratio),
            maxWidth: "100%",
          }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[11px] text-[#9a8f86] px-4 text-center">
              Envie a foto do produto / modelo
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />

          {format === "IG_REELS" ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 border border-white/40 backdrop-blur-sm">
                <span className="ml-0.5 border-y-[7px] border-y-transparent border-l-[12px] border-l-white" />
              </span>
            </div>
          ) : null}

          {isStory ? (
            <div className="absolute top-2 left-2 right-2 flex gap-1 pointer-events-none">
              <div className="h-0.5 flex-1 rounded-full bg-white/80" />
              <div className="h-0.5 flex-1 rounded-full bg-white/25" />
              <div className="h-0.5 flex-1 rounded-full bg-white/25" />
            </div>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 p-3 space-y-2">
            <p
              className="text-sm font-medium text-white leading-snug drop-shadow"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {title || "Título da arte"}
            </p>
            {body ? (
              <p className="text-[11px] text-white/90 line-clamp-2 leading-snug">
                {body}
              </p>
            ) : null}
            {ctaLabel ? (
              <div className="pt-1 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2a2420] shadow-md">
                  ↗ {ctaLabel}
                </span>
              </div>
            ) : null}
            {hashtags ? (
              <p className="text-[9px] text-white/70 line-clamp-1">{hashtags}</p>
            ) : null}
          </div>

          {showLogo ? (
            <div
              className={`absolute left-1/2 z-20 -translate-x-1/2 pointer-events-none ${
                isStory ? "top-4" : "top-2.5"
              }`}
            >
              <div className="rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-[2px] shadow-lg ring-1 ring-white/15">
                <BrandLogo size="sm" showTagline className="!h-auto scale-90" />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-[#a89f95] text-center leading-relaxed">
        Ao baixar, o link do produto é copiado. No Stories: publique a imagem →
        sticker de link → cole o link → texto “{ctaLabel || "Comprar agora"}”.
        {ctaHref ? (
          <>
            {" "}
            <span className="text-[#e8d9a8] break-all">{link.replace(/^https?:\/\//, "")}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
