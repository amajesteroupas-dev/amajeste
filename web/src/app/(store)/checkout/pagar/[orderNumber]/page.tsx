import { requireCustomer } from "@/lib/customer";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { ensurePagSeguroPublicKey } from "@/lib/payments-pagseguro";
import { getActiveSitePromotion } from "@/lib/promotion-settings";
import { signOrderAccess } from "@/lib/order-access";
import { PayPendingOrderClient } from "@/components/store/PayPendingOrderClient";
import { formatBRL } from "@/lib/utils";
import {
  expireStaleStockReservations,
  releaseOrderStockHold,
  renewPaymentDeadline,
  reservationDeadline,
} from "@/lib/order-stock-reserve";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orderNumber: string }> };

export async function generateMetadata({ params }: Props) {
  const { orderNumber } = await params;
  return { title: `Pagar pedido #${orderNumber}` };
}

export default async function PagarPedidoPage({ params }: Props) {
  const customer = await requireCustomer();
  if (!customer) redirect("/entrar");

  const { orderNumber } = await params;

  // Protege este pedido do expire antes de limpar outros
  await prisma.order.updateMany({
    where: {
      orderNumber,
      customerId: customer.id,
      status: OrderStatus.PENDING,
    },
    data: { reservedUntil: reservationDeadline() },
  });
  await expireStaleStockReservations(20);

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, payment: true, customer: true },
  });

  if (!order) notFound();

  if (order.customerId !== customer.id) {
    redirect("/conta/pedidos");
  }

  if (
    order.status !== OrderStatus.PENDING ||
    order.payment?.status === PaymentStatus.APPROVED
  ) {
    redirect(`/conta/pedidos`);
  }

  if (order.stockHeld) {
    await releaseOrderStockHold(
      order.id,
      "Estoque liberado — aguardando pagamento"
    );
  }
  await renewPaymentDeadline(order.id);

  let publicKey = "";
  try {
    publicKey = await ensurePagSeguroPublicKey();
  } catch {
    publicKey = "";
  }

  const promo = await getActiveSitePromotion();
  const maxInterestFree =
    promo.cardInstallmentsMax != null && promo.cardInstallmentsMax > 0
      ? promo.cardInstallmentsMax
      : 1;

  const accessToken = signOrderAccess(order.orderNumber);

  return (
    <div className="container-maj py-10 max-w-xl">
      <p className="text-xs text-[#8a7468] mb-2">
        <Link href="/conta/pedidos" className="underline">
          ← Meus pedidos
        </Link>
      </p>
      <h1
        className="text-3xl mb-1 text-[#2a2420]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Pagar pedido #{order.orderNumber}
      </h1>
      <p className="text-sm text-[#5c534c] mb-6">
        {order.items.map((i) => (
          <span key={i.id} className="block">
            {i.productName} · {i.size}/{i.color} × {i.quantity}
          </span>
        ))}
        <span className="block mt-2 font-semibold text-[#2a2420]">
          Total {formatBRL(Number(order.total))}
        </span>
      </p>

      <PayPendingOrderClient
        orderNumber={order.orderNumber}
        amount={Number(order.total)}
        publicKey={publicKey}
        maxInterestFree={maxInterestFree}
        defaultHolder={order.guestName || customer.name || ""}
        defaultTaxId={customer.cpf || ""}
        accessToken={accessToken}
      />
    </div>
  );
}
