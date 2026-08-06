import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { prisma } from "@/lib/prisma";
import { HOME_VIDEO_CATEGORY_SLUG } from "@/lib/category-videos";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { slug: { not: HOME_VIDEO_CATEGORY_SLUG } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true, children: true } },
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>
          Categorias
        </h1>
        <p className="text-sm text-[#6b5f56] mt-1">
          Organize a loja em categorias e subcategorias. Em cada categoria você
          pode definir um <strong>ajuste de preço</strong> (%) — útil no OUTLET
          quando há promoção no site inteiro.
        </p>
      </div>
      <CategoriesManager initialCategories={categories} />
    </div>
  );
}
