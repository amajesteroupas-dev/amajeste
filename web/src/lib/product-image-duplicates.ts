import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { uploadRoot } from "@/lib/images";

export type DupProductRef = {
  productId: string;
  productName: string;
  productSlug: string;
  active: boolean;
  /** Todas as linhas ProductImage deste produto neste grupo */
  imageIds: string[];
  url: string;
  alt: string | null;
};

export type DuplicatePhotoGroup = {
  key: string;
  kind: "url" | "arquivo";
  /** URL canônica (pathname sem query) */
  matchUrl: string;
  url: string;
  products: DupProductRef[];
  /**
   * Colisão do bug HDR antigo (várias fotos apontando para o mesmo
   * `/products-sdr/800-sdr.jpg`). Não é foto compartilhada de propósito —
   * remover “duplicatas” apaga o catálogo inteiro.
   */
  dangerous?: boolean;
  dangerReason?: string;
};

export function normalizeImageUrl(url: string): string {
  try {
    const raw = url.startsWith("http") ? new URL(url).pathname : url;
    return (raw.split("?")[0] || "").replace(/\/+/g, "/");
  } catch {
    return url.split("?")[0] || url;
  }
}

/** URL gerada pelo bug antigo de conversão HDR (basename fixo). */
export function isHdrCollisionSharedUrl(url: string): boolean {
  const norm = normalizeImageUrl(url).toLowerCase();
  return (
    /\/products-sdr\/800-sdr\.(jpe?g|webp|png)$/i.test(norm) ||
    /\/products-sdr\/\d{2,4}-sdr\.(jpe?g|webp|png)$/i.test(norm)
  );
}

function resolveLocalPath(url: string): string | null {
  const clean = normalizeImageUrl(url);
  if (clean.startsWith("/products/") || clean.startsWith("/brand/")) {
    return path.join(process.cwd(), "public", clean.replace(/^\//, ""));
  }
  if (clean.startsWith("/uploads/")) {
    return path.join(uploadRoot(), clean.replace(/^\/uploads\//, ""));
  }
  return null;
}

async function fileSha1(filePath: string): Promise<string | null> {
  try {
    const buf = await fs.readFile(filePath);
    if (buf.length < 32) return null;
    return createHash("sha1").update(buf).digest("hex");
  } catch {
    return null;
  }
}

type RawRef = {
  productId: string;
  productName: string;
  productSlug: string;
  active: boolean;
  imageId: string;
  url: string;
  alt: string | null;
};

function collapseByProduct(refs: RawRef[]): DupProductRef[] {
  const map = new Map<string, DupProductRef>();
  for (const r of refs) {
    const existing = map.get(r.productId);
    if (existing) {
      existing.imageIds.push(r.imageId);
    } else {
      map.set(r.productId, {
        productId: r.productId,
        productName: r.productName,
        productSlug: r.productSlug,
        active: r.active,
        imageIds: [r.imageId],
        url: r.url,
        alt: r.alt,
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.productName.localeCompare(b.productName, "pt-BR")
  );
}

/**
 * Agrupa fotos usadas em 2+ produtos diferentes (mesma URL ou mesmo arquivo).
 */
export async function findDuplicateProductPhotos(): Promise<{
  groups: DuplicatePhotoGroup[];
  totalImages: number;
  productsWithDupes: number;
}> {
  const rows = await prisma.productImage.findMany({
    where: { product: { deletedAt: null } },
    select: {
      id: true,
      url: true,
      alt: true,
      productId: true,
      product: {
        select: { id: true, name: true, slug: true, active: true },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const byUrl = new Map<string, RawRef[]>();
  const byHash = new Map<string, RawRef[]>();

  for (const row of rows) {
    const ref: RawRef = {
      productId: row.product.id,
      productName: row.product.name,
      productSlug: row.product.slug,
      active: row.product.active,
      imageId: row.id,
      url: row.url,
      alt: row.alt,
    };

    const norm = normalizeImageUrl(row.url);
    if (!byUrl.has(norm)) byUrl.set(norm, []);
    byUrl.get(norm)!.push(ref);

    const local = resolveLocalPath(row.url);
    if (local) {
      const hash = await fileSha1(local);
      if (hash) {
        if (!byHash.has(hash)) byHash.set(hash, []);
        byHash.get(hash)!.push(ref);
      }
    }
  }

  const groups: DuplicatePhotoGroup[] = [];

  for (const [norm, refs] of byUrl) {
    const productIds = new Set(refs.map((r) => r.productId));
    if (productIds.size < 2) continue;
    const multiPerProduct = [...productIds].some(
      (pid) => refs.filter((r) => r.productId === pid).length > 1
    );
    const hdrCollision = isHdrCollisionSharedUrl(norm);
    const dangerous = hdrCollision || multiPerProduct;
    groups.push({
      key: `url:${norm}`,
      kind: "url",
      matchUrl: norm,
      url: refs[0]!.url,
      products: collapseByProduct(refs),
      dangerous,
      dangerReason: hdrCollision
        ? "Colisão do conversor HDR (mesmo arquivo 800-sdr para vários produtos). Não use “remover duplicata” — reenvie as fotos de cada produto."
        : multiPerProduct
          ? "A mesma URL aparece várias vezes no mesmo produto (provável bug). Remover daqui apaga fotos de outros produtos. Reenvie as fotos."
          : undefined,
    });
  }

  for (const [hash, refs] of byHash) {
    const productIds = new Set(refs.map((r) => r.productId));
    if (productIds.size < 2) continue;
    const norms = new Set(refs.map((r) => normalizeImageUrl(r.url)));
    if (norms.size === 1) continue;
    groups.push({
      key: `file:${hash}`,
      kind: "arquivo",
      matchUrl: normalizeImageUrl(refs[0]!.url),
      url: refs[0]!.url,
      products: collapseByProduct(refs),
    });
  }

  groups.sort((a, b) => b.products.length - a.products.length);

  const productsWithDupes = new Set(
    groups.flatMap((g) => g.products.map((p) => p.productId))
  ).size;

  return {
    groups,
    totalImages: rows.length,
    productsWithDupes,
  };
}

