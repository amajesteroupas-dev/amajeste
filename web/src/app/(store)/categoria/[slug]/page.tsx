import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/store/ProductCard";
import { CategoryFilters } from "@/components/store/CategoryFilters";
import {
  colorToHex,
  isGenericColor,
  normalizeColor,
  pickImageForColor,
} from "@/lib/colors";
import { buildProductCardProps } from "@/lib/product-card";
import { isHomeVideoCategorySlug } from "@/lib/category-videos";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asArray(v: string | string[] | undefined) {
  if (!v) return [] as string[];
  return Array.isArray(v) ? v : [v];
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (isHomeVideoCategorySlug(slug)) notFound();

  const sp = await searchParams;
  const colorsSel = asArray(sp.cor).map(normalizeColor);
  const sizesSel = asArray(sp.tamanho);
  const min = sp.min ? Number(sp.min) : null;
  const max = sp.max ? Number(sp.max) : null;

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      children: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true },
      },
      products: {
        where: { active: true, deletedAt: null },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          variants: { where: { active: true } },
          category: { select: { priceAdjustPercent: true } },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!category) notFound();

  const childProducts =
    category.children.length > 0
      ? await prisma.product.findMany({
          where: {
            active: true,
            deletedAt: null,
            categoryId: { in: category.children.map((c) => c.id) },
          },
          include: {
            images: { orderBy: { sortOrder: "asc" } },
            variants: { where: { active: true } },
            category: { select: { priceAdjustPercent: true } },
          },
          orderBy: { name: "asc" },
        })
      : [];

  const productMap = new Map(
    [...category.products, ...childProducts].map((p) => [p.id, p])
  );

  const allProducts = [...productMap.values()].map((p) => ({
    ...p,
    variants: p.variants.map((v) => ({
      ...v,
      color: normalizeColor(v.color),
    })),
  }));

  // Facets: unique products per normalized color (skip generic "Padrão")
  const colorProducts = new Map<string, Set<string>>();
  const colorHex = new Map<string, string | null>();
  const sizeProducts = new Map<string, Set<string>>();
  let priceMin = Number.POSITIVE_INFINITY;
  let priceMax = 0;

  for (const p of allProducts) {
    const price = Number(p.price);
    priceMin = Math.min(priceMin, price);
    priceMax = Math.max(priceMax, price);
    for (const v of p.variants) {
      if ((v.stock ?? 0) <= 0) continue;
      const colorName = normalizeColor(v.color);
      if (!isGenericColor(colorName)) {
        if (!colorProducts.has(colorName)) colorProducts.set(colorName, new Set());
        colorProducts.get(colorName)!.add(p.id);
        if (!colorHex.get(colorName) && v.colorHex) {
          colorHex.set(colorName, v.colorHex);
        }
      }
      const sizeName = v.size.trim();
      if (sizeName) {
        if (!sizeProducts.has(sizeName)) sizeProducts.set(sizeName, new Set());
        sizeProducts.get(sizeName)!.add(p.id);
      }
    }
  }

  if (!Number.isFinite(priceMin)) priceMin = 0;

  const filtered = allProducts
    .map((p) => {
      const price = Number(p.price);
      if (min != null && !Number.isNaN(min) && price < min) return null;
      if (max != null && !Number.isNaN(max) && price > max) return null;

      const matchedVariants = p.variants.filter((v) => {
        if ((v.stock ?? 0) <= 0) return false;
        const colorOk =
          !colorsSel.length || colorsSel.includes(normalizeColor(v.color));
        const sizeOk = !sizesSel.length || sizesSel.includes(v.size);
        return colorOk && sizeOk;
      });

      if ((colorsSel.length || sizesSel.length) && matchedVariants.length === 0) {
        return null;
      }

      const focusColor =
        colorsSel.length === 1
          ? colorsSel[0]
          : matchedVariants[0]?.color || null;

      const imageUrl =
        pickImageForColor(p.images, focusColor) || p.images[0]?.url || null;

      return {
        product: p,
        focusColor: colorsSel.length ? focusColor : null,
        imageUrl,
      };
    })
    .filter(Boolean) as {
    product: (typeof allProducts)[number];
    focusColor: string | null;
    imageUrl: string | null;
  }[];

  const colors = [...colorProducts.entries()]
    .map(([name, set]) => ({
      name,
      count: set.size,
      hex: colorHex.get(name) || colorToHex(name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const sizes = [...sizeProducts.entries()]
    .map(([name, set]) => ({ name, count: set.size }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="container-maj py-12">
      {category.parent && (
        <p className="text-xs uppercase tracking-[0.14em] text-muted mb-3">
          <a
            href={`/categoria/${category.parent.slug}`}
            className="hover:text-rose-dark"
          >
            {category.parent.name}
          </a>
          <span className="mx-2">/</span>
          <span>{category.name}</span>
        </p>
      )}
      <h1
        className="text-4xl md:text-5xl mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {category.name}
      </h1>
      {category.description ? (
        <p className="text-muted text-sm max-w-2xl mb-4">{category.description}</p>
      ) : null}
      <p className="text-muted mb-6 text-sm">
        {filtered.length} produto(s)
        {filtered.length !== allProducts.length
          ? ` de ${allProducts.length}`
          : ""}
      </p>

      {category.children.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {category.children.map((child) => (
            <a
              key={child.id}
              href={`/categoria/${child.slug}`}
              className="text-[0.7rem] uppercase tracking-[0.14em] border border-black/15 px-3 py-1.5 text-[#333] hover:border-rose-dark hover:text-rose-dark transition-colors"
            >
              {child.name}
            </a>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <Suspense fallback={null}>
          <CategoryFilters
            colors={colors}
            sizes={sizes}
            priceMin={Math.floor(priceMin)}
            priceMax={Math.ceil(priceMax)}
          />
        </Suspense>

        <div>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 md:gap-6">
            {filtered.map(({ product: p, focusColor, imageUrl }) => {
              const props = buildProductCardProps({
                ...p,
                focusColor,
                hrefExtra: focusColor
                  ? `cor=${encodeURIComponent(focusColor)}`
                  : undefined,
              });
              return (
                <ProductCard
                  key={`${p.id}-${focusColor || "all"}`}
                  {...props}
                  imageUrl={imageUrl || props.imageUrl}
                />
              );
            })}
          </div>
          {filtered.length === 0 && (
            <p className="text-muted">
              Nenhum produto com esses filtros. Tente limpar a seleção.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
