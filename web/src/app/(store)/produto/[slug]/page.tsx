import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductView } from "@/components/store/ProductView";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductReviews } from "@/components/store/ProductReviews";
import { normalizeColor, pickImageForColor } from "@/lib/colors";
import { buildProductCardProps } from "@/lib/product-card";
import { getSizeGuideImageUrl } from "@/lib/site-settings";
import { ProductViewTracker } from "@/components/store/ProductViewTracker";
import { requireCustomer } from "@/lib/customer";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) return { title: "Produto" };
  return {
    title: product.name,
    description: product.description.slice(0, 160),
  };
}

function splitDescription(text: string) {
  const parts = text
    .split(/\n{2,}|(?=DESCRI|CUIDADOS|Composi)/i)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const corParam = Array.isArray(sp.cor) ? sp.cor[0] : sp.cor;
  const focusColor = corParam ? normalizeColor(corParam) : null;

  const product = await prisma.product.findFirst({
    where: { slug, active: true, deletedAt: null },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { active: true }, orderBy: { size: "asc" } },
      category: true,
    },
  });

  if (!product) notFound();

  const related = await prisma.product.findMany({
    where: {
      active: true,
      deletedAt: null,
      categoryId: product.categoryId,
      id: { not: product.id },
    },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 6 },
      variants: { where: { active: true } },
      category: { select: { priceAdjustPercent: true } },
    },
    take: 4,
    orderBy: { updatedAt: "desc" },
  });

  const blocks = splitDescription(product.description);
  const sizeGuideImageUrl = await getSizeGuideImageUrl();
  const images = [...product.images];
  if (focusColor) {
    const preferred = pickImageForColor(images, focusColor);
    if (preferred) {
      images.sort((a, b) =>
        a.url === preferred ? -1 : b.url === preferred ? 1 : 0
      );
    }
  }

  const customer = await requireCustomer();
  const [approvedReviews, avgAgg, myReview] = await Promise.all([
    prisma.productReview.findMany({
      where: { productId: product.id, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { customer: { select: { name: true } } },
    }),
    prisma.productReview.aggregate({
      where: { productId: product.id, status: "APPROVED" },
      _avg: { rating: true },
      _count: true,
    }),
    customer
      ? prisma.productReview.findUnique({
          where: {
            customerId_productId: {
              customerId: customer.id,
              productId: product.id,
            },
          },
          select: { status: true },
        })
      : Promise.resolve(null),
  ]);

  const publicReviews = approvedReviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    customerName: r.customer.name.split(" ")[0] || "Cliente",
  }));

  return (
    <div className="container-maj py-10 md:py-16">
      <ProductViewTracker productId={product.id} />
      <nav className="text-xs text-muted mb-6 flex flex-wrap gap-2">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <span>/</span>
        <Link
          href={`/categoria/${product.category.slug}`}
          className="hover:text-ink"
        >
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <ProductView
        name={product.name}
        categoryName={product.category.name}
        images={images}
        initialColor={focusColor}
        descriptionBlocks={blocks}
        sizeGuideImageUrl={sizeGuideImageUrl}
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price.toString(),
          compareAt: product.compareAt?.toString() || null,
          images: product.images,
          installmentsMax: product.installmentsMax,
          interestFree: product.interestFree,
          pixDiscountPercent: product.pixDiscountPercent,
          showPaymentFlags: product.showPaymentFlags,
          videoUrl: product.videoUrl,
          priceAdjustPercent: product.category.priceAdjustPercent ?? 0,
          variants: product.variants.map((v) => ({
            id: v.id,
            size: v.size,
            color: normalizeColor(v.color),
            colorHex: v.colorHex,
            stock: v.stock,
            price: v.price?.toString() || null,
          })),
        }}
      />

      <ProductReviews
        productId={product.id}
        productName={product.name}
        reviews={publicReviews}
        averageRating={avgAgg._avg.rating}
        reviewCount={avgAgg._count}
        myReviewStatus={myReview?.status ?? null}
      />

      {related.length > 0 ? (
        <section className="mt-16 md:mt-20 border-t border-black/8 pt-12">
          <h2
            className="text-2xl md:text-3xl text-[#2a2420] mb-8 text-center"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Você também pode gostar
          </h2>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} {...buildProductCardProps(p)} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
