import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductPurchase } from "@/components/store/ProductPurchase";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) return { title: "Produto" };
  return {
    title: product.name,
    description: product.description.slice(0, 160),
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug, active: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { active: true }, orderBy: { size: "asc" } },
      category: true,
    },
  });

  if (!product) notFound();

  return (
    <div className="container-maj py-10 md:py-16">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="aspect-[3/4] overflow-hidden bg-[#ebe4db]">
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[0].url}
                alt={product.images[0].alt || product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted">
                Sem imagem
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(1, 5).map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.url}
                  src={img.url}
                  alt={img.alt || product.name}
                  className="aspect-square object-cover bg-[#ebe4db]"
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted mb-2">
            {product.category.name}
          </p>
          <h1
            className="text-4xl md:text-5xl mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {product.name}
          </h1>
          <ProductPurchase
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              description: product.description,
              price: product.price.toString(),
              images: product.images,
              variants: product.variants.map((v) => ({
                id: v.id,
                size: v.size,
                color: v.color,
                colorHex: v.colorHex,
                stock: v.stock,
                price: v.price?.toString() || null,
              })),
            }}
          />
          <div className="mt-10 border-t border-line pt-6 text-sm leading-relaxed text-muted whitespace-pre-line">
            {product.description}
          </div>
        </div>
      </div>
    </div>
  );
}
