import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";
import { ProductEditForm } from "@/components/admin/ProductEditForm";
import { DeleteProductButton, CloneProductButton } from "@/components/admin/DeleteProductButton";
import { HOME_VIDEO_CATEGORY_SLUG } from "@/lib/category-videos";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string }>;
};

export default async function EditProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { novo } = await searchParams;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) notFound();
  if (product.deletedAt) redirect("/admin/produtos/lixeira");

  const categories = await prisma.category.findMany({
    where: { slug: { not: HOME_VIDEO_CATEGORY_SLUG } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      {novo === "1" ? (
        <div className="mb-4 border border-black/10 bg-[#faf7f3] px-3 py-3 text-sm">
          <p className="font-medium text-[#2a2420]">
            Produto salvo como rascunho (inativo na loja).
          </p>
          <p className="text-xs text-muted mt-1">
            Envie fotos reais, vincule cada cor no seletor da foto, confira o
            frete e só então marque “Ativo na loja”.
          </p>
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>
          {product.name}
        </h1>
        <div className="flex items-center gap-4">
          <CloneProductButton
            productId={product.id}
            productName={product.name}
            redirectToClone
          />
          <DeleteProductButton
            productId={product.id}
            productName={product.name}
          />
        </div>
      </div>
      <p className="text-sm text-muted mb-6">
        {formatBRL(Number(product.price))} · {product.slug} ·{" "}
        <span className="tabular-nums">
          {product.viewCount.toLocaleString("pt-BR")} visitas
        </span>
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
          destaque: product.destaque,
          active: product.active,
          installmentsMax: product.installmentsMax,
          interestFree: product.interestFree,
          pixDiscountPercent: product.pixDiscountPercent,
          showPaymentFlags: product.showPaymentFlags,
          weightKg: product.weightKg,
          lengthCm: product.lengthCm,
          widthCm: product.widthCm,
          heightCm: product.heightCm,
          videoUrl: product.videoUrl,
        }}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          parentId: c.parentId,
        }))}
        variants={product.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          stock: v.stock,
          active: v.active,
        }))}
        images={product.images}
      />
    </div>
  );
}
