import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/store/ProductCard";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q || "").trim();

  const products = query
    ? await prisma.product.findMany({
        where: {
          active: true,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
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
      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            name={p.name}
            slug={p.slug}
            price={p.price.toString()}
            imageUrl={p.images[0]?.url}
          />
        ))}
      </div>
    </div>
  );
}
