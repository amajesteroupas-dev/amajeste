import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/store/ProductCard";
import { BannerCarousel } from "@/components/store/BannerCarousel";
import { BrandSectionMark } from "@/components/store/BrandLogo";
import { NewsletterForm } from "@/components/store/NewsletterForm";
import { parseCutoutLayers } from "@/lib/cutout-layout";
import { buildProductCardProps } from "@/lib/product-card";

export const dynamic = "force-dynamic";

const FALLBACK_HERO = [
  { src: "/brand/hero-photo-1.jpg", label: "Performance" },
  { src: "/brand/hero-photo-2.jpg", label: "Presença" },
  { src: "/brand/hero-photo-3.jpg", label: "Conforto" },
];

export default async function HomePage() {
  const productInclude = {
    images: { orderBy: { sortOrder: "asc" as const }, take: 6 },
    variants: { where: { active: true } },
    category: { select: { id: true, parentId: true, priceAdjustPercent: true } },
  };

  const [majeste, destaques, categories, banners] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, featured: true, deletedAt: null },
      include: productInclude,
      take: 8,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.product.findMany({
      where: { active: true, destaque: true, deletedAt: null },
      include: productInclude,
      take: 12,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({
      where: {
        parentId: null,
        slug: { not: "pagina-principal" },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.banner.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  function cardProps(
    p: (typeof majeste)[number] | (typeof destaques)[number]
  ) {
    return buildProductCardProps(p);
  }
  return (
    <>
      {banners.length > 0 ? (
        <Suspense fallback={null}>
          <BannerCarousel
            banners={banners.map((b) => ({
              id: b.id,
              title: b.title,
              subtitle: b.subtitle,
              ctaLabel: b.ctaLabel,
              ctaHref: b.ctaHref,
              imageUrl: b.imageUrl,
              textAlign: b.textAlign,
              overlay: b.overlay,
              layout: b.layout,
              bgColor: b.bgColor,
              panelColor: b.panelColor,
              highlight: b.highlight,
              promoText: b.promoText,
              couponCode: b.couponCode,
              tagline: b.tagline,
              bannerSize: b.bannerSize,
              imageFit: b.imageFit,
              focalX: b.focalX,
              focalY: b.focalY,
              imageZoom: b.imageZoom,
              textStyle: b.textStyle as Record<string, unknown> | null,
              cutoutImages: parseCutoutLayers(b.cutoutImages),
              videoUrl: b.videoUrl,
              videoSeconds: b.videoSeconds,
              videoPlaylist: b.videoPlaylist,
              videoLayout: (b as { videoLayout?: string }).videoLayout,
            }))}
          />
        </Suspense>
      ) : (
        <section className="hero-studio">
          <div className="container-maj hero-studio-grid">
            <div className="hero-studio-copy">
              <p className="hero-kicker">Majesté</p>
              <h1 className="hero-title">Vista sua força</h1>
              <p className="hero-sub">
                Modelagens que unem conforto, desempenho e feminilidade em cada
                movimento.
              </p>
              <div className="hero-cta-wrap">
                <Link
                  href="/categoria/conjunto-legging"
                  className="btn btn-primary"
                >
                  Comprar agora
                </Link>
              </div>
            </div>
            <div className="hero-studio-photos">
              {FALLBACK_HERO.map((photo) => (
                <figure key={photo.src} className="hero-studio-shot">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.src}
                    alt=""
                    width={720}
                    height={1080}
                    loading="eager"
                    decoding="async"
                  />
                  <figcaption>{photo.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-white py-14">
        <div className="container-maj">
          <BrandSectionMark title="Majesté" label="Coleção Majesté" className="mb-10" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
            {majeste.map((p) => (
              <ProductCard key={p.id} {...cardProps(p)} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream py-12 border-y border-black/5">
        <div className="container-maj">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categoria/${cat.slug}`}
                className="text-[0.72rem] uppercase tracking-[0.16em] text-[#333] hover:text-rose-dark transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container-maj">
          <BrandSectionMark title="Destaques" className="mb-10" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
            {destaques.map((p) => (
              <ProductCard key={`best-${p.id}`} {...cardProps(p)} />
            ))}
          </div>
          {destaques.length === 0 && (
            <p className="text-center text-muted">Nenhum produto cadastrado.</p>
          )}
        </div>
      </section>

      <section className="bg-cream py-16">
        <div className="container-maj max-w-xl text-center">
          <h3
            className="text-3xl mb-3 text-[#3a2f28]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Inscreva-se para receber ofertas
          </h3>
          <p className="text-sm text-muted mb-6">
            Novidades, lançamentos e condições especiais no seu e-mail.
          </p>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
