import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/store/ProductCard";
import { buildProductCardProps } from "@/lib/product-card";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q || "").trim();

  const products = query
    ? await prisma.product.findMany({
        where: {
          active: true,
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          images: { take: 6, orderBy: { sortOrder: "asc" } },
          variants: { where: { active: true } },
          category: { select: { id: true, parentId: true, priceAdjustPercent: true } },
        },
        take: 24,
      })
    : [];

  return (
    <div className="container-maj py-12">
      <h1 className="text-4xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
        Busca
      </h1>
      <p className="text-muted mb-8 text-sm">
        {query ? `Resultados para “${query}”` : "Digite um termo na busca."}
      </p>
      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
        {products.map((p) => (
          <ProductCard key={p.id} {...buildProductCardProps(p)} />
        ))}
      </div>
    </div>
  );
}
