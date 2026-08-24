import { prisma } from "@/lib/prisma";
import { LaunchResetClient } from "@/components/admin/LaunchResetClient";
import {
  STOCK_RESERVE_SECONDS,
  expireStaleStockReservations,
} from "@/lib/order-stock-reserve";

export const dynamic = "force-dynamic";

export default async function AdminLancamentoPage() {
  await expireStaleStockReservations(50);

  const [productViews, siteVisits, uniqueRows, ordersTotal, ordersPending] =
    await Promise.all([
      prisma.product.aggregate({
        where: { deletedAt: null },
        _sum: { viewCount: true },
      }),
      prisma.siteVisit.count(),
      prisma.siteVisit.findMany({
        distinct: ["ipHash"],
        select: { ipHash: true },
      }),
      prisma.order.count(),
      prisma.order.count({
        where: { status: { in: ["PENDING", "PAID", "PROCESSING"] } },
      }),
    ]);

  return (
    <div>
      <h1
        className="text-3xl mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Controle de lançamento
      </h1>
      <p className="text-sm text-muted mb-4 max-w-2xl">
        Limpe métricas e pedidos de teste antes de abrir a loja oficial. Cada
        ação fica registrada no log do sistema.
      </p>
      <p className="text-sm text-[#5c534c] mb-6 max-w-2xl border border-black/8 bg-white p-3">
        Regra de estoque na loja: ao criar o pedido o produto fica{" "}
        <strong>reservado por {Math.round(STOCK_RESERVE_SECONDS / 60)} minutos</strong>. Se o
        pagamento for recusado, o pedido continua aberto para tentar de novo (a
        reserva é renovada). Só cancela e libera estoque se passar o prazo sem
        pagamento. Zerar pedidos aqui <strong>não altera</strong> o estoque
        atual.
      </p>
      <LaunchResetClient
        productViews={productViews._sum.viewCount || 0}
        siteVisits={siteVisits}
        uniqueIps={uniqueRows.length}
        ordersTotal={ordersTotal}
        ordersPending={ordersPending}
      />
    </div>
  );
}
