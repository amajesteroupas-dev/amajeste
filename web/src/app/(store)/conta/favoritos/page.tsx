import Link from "next/link";
import { requireCustomer } from "@/lib/customer";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatBRL } from "@/lib/utils";
import { FavoriteHeartButton } from "@/components/store/FavoriteHeartButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Favoritos" };

export default async function FavoritosPage() {
  const customer = await requireCustomer();
  if (!customer) redirect("/entrar");

  const favorites = await prisma.favorite.findMany({
    where: {
      customerId: customer.id,
      product: { active: true, deletedAt: null },
    },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
    },
  });

  return (
    <div>
      <h2
        className="text-xl text-[#2a2420] mb-1"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Favoritos
      </h2>
      <p className="text-sm text-[#6b5f56] mb-6">
        Peças que você curtiu — prontas para vestir a sua força.
      </p>

      {favorites.length === 0 ? (
        <div className="bg-white border border-black/8 p-8 text-center">
          <p className="text-sm text-[#5c534c] mb-4">
            Ainda não há favoritos. Explore a loja e toque no coração nas fotos.
          </p>
          <Link href="/" className="btn btn-primary !py-2">
            Ir à loja
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {favorites.map((f) => {
            const img = f.product.images[0]?.url;
            return (
              <article
                key={f.id}
                className="bg-white border border-black/8 overflow-hidden group"
              >
                <div className="relative aspect-[3/4] bg-[#ece6df]">
                  <Link href={`/produto/${f.product.slug}`} className="block h-full">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={f.product.name}
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted text-sm">
                        Sem foto
                      </div>
                    )}
                  </Link>
                  <div className="absolute top-2 right-2 z-10">
                    <FavoriteHeartButton
                      productId={f.productId}
                      size="md"
                      className="h-9 w-9 rounded-full bg-white/90 shadow-sm"
                    />
                  </div>
                </div>
                <div className="p-3 text-center sm:text-left">
                  <Link
                    href={`/produto/${f.product.slug}`}
                    className="text-[11px] sm:text-xs uppercase tracking-[0.12em] hover:text-[#a85f64]"
                  >
                    {f.product.name}
                  </Link>
                  <p className="mt-1 text-sm font-semibold">
                    {formatBRL(Number(f.product.price))}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
