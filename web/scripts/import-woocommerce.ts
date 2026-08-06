import { PrismaClient } from "@prisma/client";

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

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

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
        featured: false,
      },
      create: {
        name: p.name,
        slug,
        description,
        price,
        categoryId: category.id,
        featured: false,
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

    // Refresh images so updates from Woo replace placeholders
    if (p.images?.length) {
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
      await prisma.productImage.createMany({
        data: p.images.slice(0, 6).map((img, i) => ({
          productId: product.id,
          url: img.src,
          alt: img.alt || p.name,
          isPrimary: i === 0,
          sortOrder: i,
        })),
      });
    }

    if (p.variations_data?.length) {
      for (const v of p.variations_data) {
        const size =
          v.attributes?.find((a) => /tamanho|size/i.test(a.name))?.option ||
          "Único";
        const colorRaw =
          v.attributes?.find((a) => /cor|color/i.test(a.name))?.option ||
          "Padrão";
        const color = normalizeImportedColor(colorRaw);
        const sku = v.sku || `${slug}-${slugify(size)}-${slugify(color)}`;
        const stock = v.stock_quantity ?? 0;
        const price = v.price ? Number(v.price) : null;

        // Prefer compound unique (productId+size+color) so seed SKUs don't collide
        const existing = await prisma.productVariant.findUnique({
          where: {
            productId_size_color: { productId: product.id, size, color },
          },
        });
        if (existing) {
          await prisma.productVariant.update({
            where: { id: existing.id },
            data: {
              stock,
              price,
              active: true,
              // keep existing SKU if Woo SKU is empty
              ...(v.sku ? { sku: v.sku } : {}),
            },
          });
        } else {
          const skuTaken = await prisma.productVariant.findUnique({
            where: { sku },
          });
          await prisma.productVariant.create({
            data: {
              productId: product.id,
              sku: skuTaken ? `${sku}-${Date.now().toString(36)}` : sku,
              size,
              color,
              stock,
              price,
              active: true,
            },
          });
        }
      }
    } else {
      const size = "Único";
      const color = "Padrão";
      const sku = p.sku || `${slug}-default`;
      const stock = p.stock_quantity ?? 0;
      const existing = await prisma.productVariant.findUnique({
        where: {
          productId_size_color: { productId: product.id, size, color },
        },
      });
      if (existing) {
        await prisma.productVariant.update({
          where: { id: existing.id },
          data: {
            stock,
            active: true,
            ...(p.sku ? { sku: p.sku } : {}),
          },
        });
      } else {
        const skuTaken = await prisma.productVariant.findUnique({
          where: { sku },
        });
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: skuTaken ? `${sku}-${Date.now().toString(36)}` : sku,
            size,
            color,
            stock,
            active: true,
          },
        });
      }
    }

    console.log("OK:", product.name);
  }

  console.log("Importação concluída.");
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeImportedColor(raw: string) {
  const map: Record<string, string> = {
    azul: "Azul",
    azul3: "Azul",
    "azul marinho": "Azul Marinho",
    "azul bebe": "Azul bebê",
    "azul bebê": "Azul bebê",
    "azul agua": "Azul água",
    rosa: "Rosa",
    "rosa bebe": "Rosa bebê",
    "rosa bebê": "Rosa bebê",
    rosabb: "Rosa bebê",
    "rosa pink": "Rosa pink",
    "rosa claro": "Rosa claro",
    "rosa ciclete": "Rosa chiclete",
    "rosa salmao": "Rosa salmão",
    vermelho: "Vermelho",
    vermelhovaness: "Vermelho",
    bordo: "Bordô",
    bordô: "Bordô",
    marrom: "Marrom",
    marrom1: "Marrom",
    marromvaness: "Marrom",
    chocolate: "Chocolate",
    preto: "Preto",
    branco: "Branco",
    off: "Off-white",
    bege: "Bege",
    cinza: "Cinza",
    "cinza claro": "Cinza claro",
    verde: "Verde",
    "verde militar": "Verde militar",
    "verde siciliano": "Verde siciliano",
    "verde florescente": "Verde fluorescente",
    roxo: "Roxo",
    roxo1: "Roxo",
    "roxo médio": "Roxo médio",
    "roxo medio": "Roxo médio",
    laranja: "Laranja",
    laranjado: "Laranja",
  };
  const key = raw.trim().toLowerCase();
  return map[key] || raw.trim().replace(/\s+/g, " ");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
