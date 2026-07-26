import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/utils";

/**
 * Import products from a WooCommerce REST API export JSON.
 *
 * Usage:
 *   WOO_JSON=./woo-products.json npx tsx scripts/import-woocommerce.ts
 *
 * Expected JSON: array of WooCommerce products (or { products: [...] })
 * with fields: name, slug, description/short_description, regular_price,
 * categories[], images[], attributes / variations (size, color, stock).
 */

const prisma = new PrismaClient();

type WooImage = { src: string; alt?: string };
type WooCategory = { name: string; slug: string };
type WooProduct = {
  name: string;
  slug?: string;
  description?: string;
  short_description?: string;
  regular_price?: string;
  price?: string;
  categories?: WooCategory[];
  images?: WooImage[];
  sku?: string;
  stock_quantity?: number;
  attributes?: { name: string; options?: string[] }[];
  variations_data?: {
    sku?: string;
    stock_quantity?: number;
    attributes?: { name: string; option: string }[];
    price?: string;
  }[];
};

async function ensureCategory(name: string, slug: string) {
  return prisma.category.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
}

async function main() {
  const fs = await import("fs/promises");
  const path = process.env.WOO_JSON || "./woo-products.json";
  const raw = await fs.readFile(path, "utf8");
  const parsed = JSON.parse(raw);
  const products: WooProduct[] = Array.isArray(parsed)
    ? parsed
    : parsed.products || [];

  console.log(`Importando ${products.length} produtos...`);

  for (const p of products) {
    const cat = p.categories?.[0];
    const category = await ensureCategory(
      cat?.name || "Diversos",
      cat?.slug || "diversos"
    );

    const slug = p.slug || slugify(p.name);
    const price = Number(p.regular_price || p.price || 0);
    const description =
      stripHtml(p.description || p.short_description || p.name);

    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        name: p.name,
        description,
        price,
        categoryId: category.id,
        active: true,
      },
      create: {
        name: p.name,
        slug,
        description,
        price,
        categoryId: category.id,
        images: {
          create: (p.images || []).slice(0, 6).map((img, i) => ({
            url: img.src,
            alt: img.alt || p.name,
            isPrimary: i === 0,
            sortOrder: i,
          })),
        },
      },
    });

    if (p.variations_data?.length) {
      for (const v of p.variations_data) {
        const size =
          v.attributes?.find((a) => /tamanho|size/i.test(a.name))?.option ||
          "Único";
        const color =
          v.attributes?.find((a) => /cor|color/i.test(a.name))?.option ||
          "Padrão";
        const sku = v.sku || `${slug}-${slugify(size)}-${slugify(color)}`;
        await prisma.productVariant.upsert({
          where: { sku },
          update: {
            size,
            color,
            stock: v.stock_quantity ?? 0,
            price: v.price ? Number(v.price) : null,
          },
          create: {
            productId: product.id,
            sku,
            size,
            color,
            stock: v.stock_quantity ?? 0,
            price: v.price ? Number(v.price) : null,
          },
        });
      }
    } else {
      const sku = p.sku || `${slug}-default`;
      await prisma.productVariant.upsert({
        where: { sku },
        update: { stock: p.stock_quantity ?? 0 },
        create: {
          productId: product.id,
          sku,
          size: "Único",
          color: "Padrão",
          stock: p.stock_quantity ?? 0,
        },
      });
    }

    console.log("OK:", product.name);
  }

  console.log("Importação concluída.");
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
