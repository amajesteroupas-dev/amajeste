import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/store/ProductCard";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: { active: true },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!category) notFound();

  return (
    <div className="container-maj py-12">
      <h1
        className="text-4xl md:text-5xl mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {category.name}
      </h1>
      <p className="text-muted mb-10 text-sm">
        {category.products.length} produto(s)
      </p>
      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
        {category.products.map((p) => (
          <ProductCard
            key={p.id}
            name={p.name}
            slug={p.slug}
            price={p.price.toString()}
            compareAt={p.compareAt?.toString()}
            imageUrl={p.images[0]?.url}
          />
        ))}
      </div>
      {category.products.length === 0 && (
        <p className="text-muted">Nenhum produto nesta categoria.</p>
      )}
    </div>
  );
}
