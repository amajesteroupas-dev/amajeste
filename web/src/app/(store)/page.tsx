import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/store/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, categories] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, featured: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      take: 8,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <section className="relative min-h-[88vh] overflow-hidden bg-[#efe8df]">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(circle at 75% 40%, #f0c9b5 0%, transparent 42%), radial-gradient(circle at 20% 80%, #e8d5c4 0%, transparent 35%), linear-gradient(135deg, #f7f1ea, #ebe0d4)",
          }}
        />
        <div className="container-maj relative grid min-h-[88vh] items-center gap-10 py-16 lg:grid-cols-2">
          <div className="hero-animate max-w-xl">
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-gold-dark">
              Coleção fitness
            </p>
            <h1
              className="text-6xl leading-[0.95] md:text-7xl text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Majesté
            </h1>
            <p className="mt-2 text-3xl md:text-4xl text-ink/80" style={{ fontFamily: "var(--font-display)" }}>
              Vista sua força
            </p>
            <p className="mt-5 max-w-md text-base text-muted leading-relaxed hero-animate-delay">
              Modelagens que unem conforto, desempenho e feminilidade em cada
              movimento.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/categoria/conjunto-legging" className="btn btn-primary">
                Comprar agora
              </Link>
              <Link href="/categoria/outlet" className="btn btn-outline">
                Ver outlet
              </Link>
            </div>
          </div>
          <div className="relative hidden lg:block hero-animate-delay">
            <div className="aspect-[4/5] bg-[url('/hero-pattern.svg')] bg-cover bg-center shadow-2xl shadow-black/10" />
          </div>
        </div>
      </section>

      <section className="container-maj py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2
            className="text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Categorias
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className="border border-line bg-surface px-3 py-6 text-center text-sm uppercase tracking-[0.1em] hover:border-gold hover:text-rose-dark transition-colors"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="container-maj pb-20">
        <h2
          className="mb-8 text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Mais vendidos
        </h2>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
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
        {featured.length === 0 && (
          <p className="text-muted">
            Nenhum produto cadastrado ainda. Acesse o admin para começar.
          </p>
        )}
      </section>
    </>
  );
}
