import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";
import { ProductEditForm } from "@/components/admin/ProductEditForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) notFound();

  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <h1 className="text-3xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
        {product.name}
      </h1>
      <p className="text-sm text-muted mb-6">
        {formatBRL(Number(product.price))} · {product.slug}
      </p>
      <ProductEditForm
        product={{
          id: product.id,
          name: product.name,
          description: product.description,
          price: Number(product.price),
          costPrice: Number(product.costPrice),
          categoryId: product.categoryId,
          featured: product.featured,
          active: product.active,
        }}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        variants={product.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          stock: v.stock,
        }))}
        images={product.images}
      />
    </div>
  );
}
