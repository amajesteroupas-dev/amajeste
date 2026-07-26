import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payment: true,
      shipment: true,
      customer: true,
    },
  });
  if (!order) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
        Pedido {order.orderNumber}
      </h1>
      <p className="text-sm text-muted mb-6">
        {order.createdAt.toLocaleString("pt-BR")}
      </p>

      <OrderStatusForm
        orderId={order.id}
        status={order.status}
        trackingCode={order.trackingCode || ""}
      />

      <section className="mt-6 border border-line bg-surface p-5 space-y-2 text-sm">
        <p>
          <strong>Cliente:</strong> {order.customer?.name || order.guestName} (
          {order.guestEmail || order.customer?.email})
        </p>
        <p>
          <strong>Telefone:</strong> {order.guestPhone || order.customer?.phone || "—"}
        </p>
        <p>
          <strong>Endereço:</strong> {order.shippingStreet}, {order.shippingNumber}{" "}
          {order.shippingComplement} — {order.shippingNeighborhood},{" "}
          {order.shippingCity}/{order.shippingState} — CEP {order.shippingZip}
        </p>
        <p>
          <strong>Frete:</strong> {order.shippingMethod} ({formatBRL(Number(order.shippingCost))})
        </p>
        <p>
          <strong>Pagamento:</strong> {order.payment?.method} / {order.payment?.status}
        </p>
      </section>

      <table className="table mt-6 border border-line bg-surface">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qtd</th>
            <th>Unit</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>
                {item.productName} ({item.size}/{item.color})
              </td>
              <td>{item.quantity}</td>
              <td>{formatBRL(Number(item.unitPrice))}</td>
              <td>{formatBRL(Number(item.total))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-right text-lg font-semibold">
        Total {formatBRL(Number(order.total))}
      </p>
    </div>
  );
}
