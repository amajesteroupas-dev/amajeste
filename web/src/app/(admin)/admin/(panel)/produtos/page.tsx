import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";
import {
  ProductsTable,
  type ProductsTableItem,
} from "@/components/admin/ProductsTable";
import { HOME_VIDEO_CATEGORY_SLUG } from "@/lib/category-videos";
import { isRealProductImage } from "@/lib/product-readiness";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, categories, trashCount] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: { include: { parent: { select: { name: true } } } },
        variants: true,
        images: { select: { url: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({
      where: { slug: { not: HOME_VIDEO_CATEGORY_SLUG } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.product.count({ where: { deletedAt: { not: null } } }),
  ]);

  const tableItems: ProductsTableItem[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    viewCount: p.viewCount,
    featured: p.featured,
    destaque: p.destaque,
    active: p.active,
    categoryId: p.categoryId,
    categoryLabel: p.category.parent
      ? `${p.category.parent.name} › ${p.category.name}`
      : p.category.name,
    weightKg: p.weightKg,
    lengthCm: p.lengthCm,
    widthCm: p.widthCm,
    heightCm: p.heightCm,
    imageCount: p.images.filter((img) => isRealProductImage(img.url)).length,
    variants: p.variants.map((v) => ({
      size: v.size,
      stock: v.stock,
      minStock: v.minStock,
    })),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>
          Produtos
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/produtos/fotos-duplicadas"
            className="text-sm px-3 py-2 border border-black/15 bg-white hover:bg-[#f7f1ea]"
          >
            Fotos duplicadas
          </Link>
          <Link
            href="/admin/produtos/textos"
            className="text-sm px-3 py-2 border border-black/15 bg-white hover:bg-[#f7f1ea]"
          >
            Textos de pagamento
          </Link>
          <Link
            href="/admin/produtos/lixeira"
            className="text-sm px-3 py-2 border border-black/15 bg-white hover:bg-[#f7f1ea]"
          >
            Lixeira{trashCount > 0 ? ` (${trashCount})` : ""}
          </Link>
        </div>
      </div>

      <ProductForm
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          parentId: c.parentId,
        }))}
      />

      <ProductsTable
        products={tableItems}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          parentId: c.parentId,
        }))}
      />
    </div>
  );
}
