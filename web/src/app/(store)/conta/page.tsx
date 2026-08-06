import Link from "next/link";
import { requireCustomer } from "@/lib/customer";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";
import { redirect } from "next/navigation";
import { Heart, Package, Images, UserRound, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const customer = await requireCustomer();
  if (!customer) redirect("/entrar");

  const [orders, looks, favoritesCount] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.lookPost.count({
      where: { customerId: customer.id, status: "APPROVED" },
    }),
    prisma.favorite.count({ where: { customerId: customer.id } }),
  ]);

  const cards = [
    {
      href: "/conta/pedidos",
      label: "Pedidos",
      value: String(orders.length),
      hint: "Acompanhar compras",
      icon: Package,
    },
    {
      href: "/conta/favoritos",
      label: "Favoritos",
      value: String(favoritesCount),
      hint: "Peças que você amou",
      icon: Heart,
    },
    {
      href: "/looks",
      label: "Galeria Majesté",
      value: "Ver",
      hint: "Looks públicos da comunidade",
      icon: Images,
    },
    {
      href: "/academia/galeria",
      label: "Seja Influence",
      value: String(looks),
      hint: "Publique seu look e ganhe cupom",
      icon: Sparkles,
    },
    {
      href: "/conta/perfil",
      label: "Perfil",
      value: "Editar",
      hint: "Dados e endereços",
      icon: UserRound,
    },
  ];

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href + c.label}
              href={c.href}
              className="group relative overflow-hidden border border-[#2a2420]/08 bg-[#faf7f3] p-5 transition-all hover:border-[#a85f64]/45 hover:bg-white hover:shadow-[0_10px_30px_rgba(42,36,32,0.06)]"
            >
              <div
                className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-40 transition-opacity group-hover:opacity-70"
                style={{
                  background:
                    "radial-gradient(circle, rgba(196,122,126,0.35) 0%, transparent 70%)",
                }}
              />
              <span className="relative inline-flex h-11 w-11 items-center justify-center border border-[#2a2420]/10 bg-white text-[#a85f64] mb-4">
                <Icon size={20} strokeWidth={1.5} />
              </span>
              <p className="relative text-[11px] uppercase tracking-[0.16em] text-[#8a7468]">
                {c.label}
              </p>
              <p className="relative text-2xl font-semibold text-[#2a2420] mt-1 tabular-nums">
                {c.value}
              </p>
              <p className="relative text-xs text-[#6b5f56] mt-2">{c.hint}</p>
            </Link>
          );
        })}
      </div>

      {customer.ambassadorDiscountPercent > 0 ? (
        <div className="border border-[#c47a7e]/30 bg-[#c47a7e]/10 px-5 py-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center bg-white text-[#a85f64] border border-[#c47a7e]/25">
            <Sparkles size={16} />
          </span>
          <div>
            <p className="text-sm font-medium text-[#2a2420]">
              Influence Majesté · {customer.ambassadorDiscountPercent}% de
              créditos
            </p>
            <p className="text-xs text-[#5c534c] mt-0.5">
              Continue publicando looks — o reconhecimento acompanha você.
            </p>
          </div>
        </div>
      ) : null}

      <section>
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2
            className="text-xl text-[#2a2420]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Últimos pedidos
          </h2>
          <Link
            href="/conta/pedidos"
            className="text-[11px] uppercase tracking-[0.12em] text-[#8a7468] hover:text-[#a85f64]"
          >
            Ver todos
          </Link>
        </div>
        {orders.length === 0 ? (
          <div className="border border-dashed border-[#2a2420]/15 bg-[#faf7f3]/80 px-5 py-8 text-center">
            <p className="text-sm text-[#5c534c] mb-3">
              Ainda sem pedidos. Explore a loja e encontre a peça do seu próximo
              look.
            </p>
            <Link href="/" className="btn btn-primary !py-2 !px-4 text-xs">
              Ir à loja
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <div
                key={o.id}
                className="border border-[#2a2420]/08 bg-[#faf7f3]/60 px-4 py-3 flex flex-wrap justify-between gap-2 text-sm"
              >
                <div>
                  <p className="font-medium text-[#2a2420]">#{o.orderNumber}</p>
                  <p className="text-[11px] text-[#8a7468]">
                    {new Date(o.createdAt).toLocaleDateString("pt-BR")} ·{" "}
                    {o.status}
                  </p>
                </div>
                <p className="font-semibold text-[#2a2420]">
                  {formatBRL(Number(o.total))}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
